
-- ============================================================
-- Fase 2 — Triggers de Gamificação
-- ============================================================

-- ── 1. Função central: conceder XP e subir de nível ─────────
CREATE OR REPLACE FUNCTION public.conceder_xp(
  p_user_id    uuid,
  p_xp         int,
  p_acao       text,
  p_ref_id     uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_total       int;
  v_nivel          int;
  v_xp_proximo     int;
BEGIN
  -- Garante row em gamificacao_perfis
  INSERT INTO gamificacao_perfis (user_id, xp_total, nivel, xp_proximo_nivel, ultima_atividade_date)
  VALUES (p_user_id, 0, 1, 100, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  -- Registra no log (evita duplicata por acao+ref no mesmo dia)
  INSERT INTO gamificacao_xp_log (user_id, acao, xp_ganho, referencia_id)
  SELECT p_user_id, p_acao, p_xp, p_ref_id
  WHERE NOT EXISTS (
    SELECT 1 FROM gamificacao_xp_log
    WHERE user_id    = p_user_id
      AND acao       = p_acao
      AND (referencia_id = p_ref_id OR (referencia_id IS NULL AND p_ref_id IS NULL))
      AND created_at::date = CURRENT_DATE
  );

  -- Atualiza XP + streak
  UPDATE gamificacao_perfis
  SET
    xp_total             = xp_total + p_xp,
    ultima_atividade_date = CURRENT_DATE,
    streak_atual         = CASE
                             WHEN ultima_atividade_date = CURRENT_DATE - 1 THEN streak_atual + 1
                             WHEN ultima_atividade_date = CURRENT_DATE     THEN streak_atual
                             ELSE 1
                           END,
    streak_maximo        = GREATEST(streak_maximo,
                             CASE
                               WHEN ultima_atividade_date = CURRENT_DATE - 1 THEN streak_atual + 1
                               WHEN ultima_atividade_date = CURRENT_DATE     THEN streak_atual
                               ELSE 1
                             END),
    updated_at           = now()
  WHERE user_id = p_user_id
  RETURNING xp_total, nivel, xp_proximo_nivel
  INTO v_xp_total, v_nivel, v_xp_proximo;

  -- Subir de nível enquanto XP >= xp_proximo_nivel
  WHILE v_xp_total >= v_xp_proximo LOOP
    v_nivel      := v_nivel + 1;
    v_xp_proximo := ROUND(v_xp_proximo * 1.5);   -- curva de progressão

    UPDATE gamificacao_perfis
    SET nivel = v_nivel, xp_proximo_nivel = v_xp_proximo, updated_at = now()
    WHERE user_id = p_user_id;
  END LOOP;
END;
$$;

-- ── 2. Função central: desbloquear conquista ─────────────────
CREATE OR REPLACE FUNCTION public.desbloquear_conquista(
  p_user_id uuid,
  p_codigo  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conquista conquistas%ROWTYPE;
BEGIN
  SELECT * INTO v_conquista FROM conquistas WHERE codigo = p_codigo;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO usuario_conquistas (user_id, conquista_id, desbloqueado_em)
  VALUES (p_user_id, v_conquista.id, now())
  ON CONFLICT DO NOTHING;

  -- XP de recompensa da conquista
  IF v_conquista.xp_recompensa > 0 THEN
    PERFORM conceder_xp(p_user_id, v_conquista.xp_recompensa, 'conquista_' || p_codigo, v_conquista.id);
  END IF;

  -- Notificação in-app
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, referencia_id)
  VALUES (
    p_user_id,
    'conquista_desbloqueada',
    '🏆 ' || v_conquista.nome,
    'Você desbloqueou a conquista "' || v_conquista.nome || '" e ganhou ' || v_conquista.xp_recompensa || ' XP!',
    v_conquista.id
  );
END;
$$;

-- ── 3. Trigger: livro concluído → XP + conquistas de leitura ─
CREATE OR REPLACE FUNCTION public.trg_gamificacao_livro_concluido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_concluidos int;
BEGIN
  -- Só dispara quando status muda PARA concluido/lido
  IF NEW.status NOT IN ('concluido', 'lido') THEN RETURN NEW; END IF;
  IF OLD.status IN ('concluido', 'lido') THEN RETURN NEW; END IF;

  -- 50 XP por livro concluído
  PERFORM conceder_xp(NEW.user_id, 50, 'livro_concluido', NEW.id);

  -- Contar total de livros concluídos
  SELECT COUNT(*) INTO v_total_concluidos
  FROM usuario_livros
  WHERE user_id = NEW.user_id
    AND status IN ('concluido', 'lido');

  -- Marcos de conquista
  IF v_total_concluidos = 1   THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_1');   END IF;
  IF v_total_concluidos = 5   THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_5');   END IF;
  IF v_total_concluidos = 10  THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_10');  END IF;
  IF v_total_concluidos = 50  THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_50');  END IF;
  IF v_total_concluidos = 100 THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_100'); END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gamificacao_livro_concluido ON public.usuario_livros;
CREATE TRIGGER trg_gamificacao_livro_concluido
  AFTER UPDATE ON public.usuario_livros
  FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_livro_concluido();

-- ── 4. Trigger: streak de 7 dias → conquista ─────────────────
CREATE OR REPLACE FUNCTION public.trg_gamificacao_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.streak_atual >= 7   THEN PERFORM desbloquear_conquista(NEW.user_id, 'consistencia_7');   END IF;
  IF NEW.streak_atual >= 30  THEN PERFORM desbloquear_conquista(NEW.user_id, 'consistencia_30');  END IF;
  IF NEW.streak_atual >= 100 THEN PERFORM desbloquear_conquista(NEW.user_id, 'consistencia_100'); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gamificacao_streak ON public.gamificacao_perfis;
CREATE TRIGGER trg_gamificacao_streak
  AFTER UPDATE OF streak_atual ON public.gamificacao_perfis
  FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_streak();

-- ── 5. Trigger: primeiro insight (leitura_pos inserido) ──────
CREATE OR REPLACE FUNCTION public.trg_gamificacao_insight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total   int;
BEGIN
  -- Buscar user_id via leituras → usuario_leituras → usuario_livros
  SELECT ul.user_id INTO v_user_id
  FROM leituras l
  JOIN usuario_leituras ul_j ON ul_j.id = l.usuario_leitura_id
  JOIN usuario_livros ul     ON ul.id   = ul_j.usuario_livro_id
  WHERE l.id = NEW.leitura_id
  LIMIT 1;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM conceder_xp(v_user_id, 20, 'insight_registrado', NEW.leitura_id);

  SELECT COUNT(*) INTO v_total
  FROM leitura_pos lp
  JOIN leituras l ON l.id = lp.leitura_id
  JOIN usuario_leituras ul_j ON ul_j.id = l.usuario_leitura_id
  JOIN usuario_livros ul     ON ul.id   = ul_j.usuario_livro_id
  WHERE ul.user_id = v_user_id;

  IF v_total = 1   THEN PERFORM desbloquear_conquista(v_user_id, 'conhecimento_1');   END IF;
  IF v_total = 10  THEN PERFORM desbloquear_conquista(v_user_id, 'conhecimento_10');  END IF;
  IF v_total = 100 THEN PERFORM desbloquear_conquista(v_user_id, 'conhecimento_100'); END IF;

  RETURN NEW;
END;
$$;

-- Trigger em leitura_pos (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='leitura_pos') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_gamificacao_insight ON public.leitura_pos';
    EXECUTE 'CREATE TRIGGER trg_gamificacao_insight
               AFTER INSERT ON public.leitura_pos
               FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_insight()';
  END IF;
END $$;
