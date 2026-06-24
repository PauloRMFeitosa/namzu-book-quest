-- ================================================================
-- Fase 1: Unificar motor de XP
-- Problema: dois motores (conceder_xp / dar_xp) com fórmulas
-- incompatíveis de nível e sem contexto de clube em conceder_xp.
-- Solução: Motor A (conceder_xp) absorve Motor B (dar_xp).
-- ================================================================

-- 1. Reescreve conceder_xp com suporte a p_clube_id
--    - Grava clube_id no log quando aplicável
--    - Dedup unificado por (user_id, acao, referencia_id, dia)
--    - Se dedup bloqueia, retroativamente registra clube_id no log
--    - Chama refresh_ranking() quando há contexto de clube
CREATE OR REPLACE FUNCTION public.conceder_xp(
  p_user_id  uuid,
  p_xp       integer,
  p_acao     text,
  p_ref_id   uuid    DEFAULT NULL::uuid,
  p_clube_id uuid    DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp_total   int;
  v_nivel      int;
  v_xp_proximo int;
  v_inserted   boolean := false;
BEGIN
  -- Garante row em gamificacao_perfis
  INSERT INTO gamificacao_perfis (user_id, xp_total, nivel, xp_proximo_nivel, ultima_atividade_date)
  VALUES (p_user_id, 0, 1, 100, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  -- Tenta inserir no log; captura se o insert realmente aconteceu (dedup diário)
  WITH ins AS (
    INSERT INTO gamificacao_xp_log (user_id, acao, xp_ganho, referencia_id, clube_id)
    SELECT p_user_id, p_acao, p_xp, p_ref_id, p_clube_id
    WHERE NOT EXISTS (
      SELECT 1 FROM gamificacao_xp_log
      WHERE user_id  = p_user_id
        AND acao     = p_acao
        AND (referencia_id = p_ref_id OR (referencia_id IS NULL AND p_ref_id IS NULL))
        AND created_at::date = CURRENT_DATE
    )
    RETURNING true AS inserted
  )
  SELECT COALESCE(MAX(inserted), false) INTO v_inserted FROM ins;

  -- Dedup bloqueou: retroativamente registra clube_id se não estava gravado
  IF NOT v_inserted THEN
    IF p_clube_id IS NOT NULL THEN
      UPDATE gamificacao_xp_log
      SET clube_id = p_clube_id
      WHERE user_id  = p_user_id
        AND acao     = p_acao
        AND (referencia_id = p_ref_id OR (referencia_id IS NULL AND p_ref_id IS NULL))
        AND created_at::date = CURRENT_DATE
        AND clube_id IS NULL;
      PERFORM refresh_ranking();
    END IF;
    RETURN;
  END IF;

  -- Atualiza XP e streak
  UPDATE gamificacao_perfis
  SET
    xp_total              = xp_total + p_xp,
    ultima_atividade_date = CURRENT_DATE,
    streak_atual          = CASE
                              WHEN ultima_atividade_date = CURRENT_DATE - 1 THEN streak_atual + 1
                              WHEN ultima_atividade_date = CURRENT_DATE     THEN streak_atual
                              ELSE 1
                            END,
    streak_maximo         = GREATEST(streak_maximo,
                              CASE
                                WHEN ultima_atividade_date = CURRENT_DATE - 1 THEN streak_atual + 1
                                WHEN ultima_atividade_date = CURRENT_DATE     THEN streak_atual
                                ELSE 1
                              END),
    updated_at            = now()
  WHERE user_id = p_user_id
  RETURNING xp_total, nivel, xp_proximo_nivel
  INTO v_xp_total, v_nivel, v_xp_proximo;

  -- Sobe de nível enquanto XP >= xp_proximo_nivel (fórmula geométrica)
  WHILE v_xp_total >= v_xp_proximo LOOP
    v_nivel      := v_nivel + 1;
    v_xp_proximo := ROUND(v_xp_proximo * 1.5);
    UPDATE gamificacao_perfis
    SET nivel = v_nivel, xp_proximo_nivel = v_xp_proximo, updated_at = now()
    WHERE user_id = p_user_id;
  END LOOP;

  -- Atualiza ranking do clube quando aplicável
  IF p_clube_id IS NOT NULL THEN
    PERFORM refresh_ranking();
  END IF;
END;
$$;

-- 2. trg_gamificacao_livro_concluido usa obra_id como referencia_id
--    para dedup unificado com trg_concluir_livro
CREATE OR REPLACE FUNCTION public.trg_gamificacao_livro_concluido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total int;
BEGIN
  IF NEW.status NOT IN ('concluido', 'lido') THEN RETURN NEW; END IF;
  IF OLD.status IN ('concluido', 'lido') THEN RETURN NEW; END IF;

  PERFORM conceder_xp(NEW.user_id, 50, 'livro_concluido', NEW.obra_id);

  SELECT COUNT(*) INTO v_total
  FROM usuario_livros
  WHERE user_id = NEW.user_id
    AND status IN ('concluido', 'lido');

  IF v_total = 1   THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_1');   END IF;
  IF v_total = 5   THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_5');   END IF;
  IF v_total = 10  THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_10');  END IF;
  IF v_total = 50  THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_50');  END IF;
  IF v_total = 100 THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_100'); END IF;

  RETURN NEW;
END;
$$;

-- 3. trg_concluir_livro aponta para conceder_xp com clube_id
--    - mesma acao + referencia_id que trg_gamificacao_livro_concluido
--    - conceder_xp deduplica automaticamente se ambos disparam
--    - remove o check quebrado 'primeiro_livro' (leitura_1 é
--      responsabilidade exclusiva de trg_gamificacao_livro_concluido)
CREATE OR REPLACE FUNCTION public.trg_concluir_livro()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    PERFORM conceder_xp(NEW.user_id, 50, 'livro_concluido', NEW.obra_id, NEW.clube_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Remove Motor B (dar_xp — função obsoleta)
DROP FUNCTION IF EXISTS public.dar_xp(uuid, text, integer, uuid, uuid);
