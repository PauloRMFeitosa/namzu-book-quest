-- ================================================================
-- Fase 3: Motor de missões server-side
-- ================================================================

ALTER TABLE usuario_missoes
  ADD COLUMN IF NOT EXISTS data date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE usuario_missoes DROP CONSTRAINT IF EXISTS usuario_missoes_pkey;
ALTER TABLE usuario_missoes ADD PRIMARY KEY (user_id, missao_id, data);

CREATE OR REPLACE FUNCTION public.registrar_progresso_missao(
  p_user_id    uuid,
  p_meta_acao  text,
  p_incremento integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r_missao    record;
  v_novo_prog integer;
BEGIN
  FOR r_missao IN
    SELECT id, meta_valor, xp_recompensa
    FROM missoes
    WHERE meta_acao  = p_meta_acao
      AND ativo_de  <= CURRENT_DATE
      AND ativo_ate >= CURRENT_DATE
  LOOP
    INSERT INTO usuario_missoes (user_id, missao_id, data, progresso_atual, concluida)
    VALUES (p_user_id, r_missao.id, CURRENT_DATE, p_incremento, false)
    ON CONFLICT (user_id, missao_id, data) DO UPDATE
      SET progresso_atual = CASE
            WHEN usuario_missoes.concluida THEN usuario_missoes.progresso_atual
            ELSE usuario_missoes.progresso_atual + p_incremento
          END;

    SELECT progresso_atual INTO v_novo_prog
    FROM usuario_missoes
    WHERE user_id = p_user_id AND missao_id = r_missao.id AND data = CURRENT_DATE;

    IF v_novo_prog >= r_missao.meta_valor THEN
      UPDATE usuario_missoes
      SET concluida = true, concluida_em = now()
      WHERE user_id   = p_user_id
        AND missao_id = r_missao.id
        AND data      = CURRENT_DATE
        AND NOT concluida;

      IF FOUND THEN
        PERFORM conceder_xp(p_user_id, r_missao.xp_recompensa, 'missao_concluida', r_missao.id);
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_missao_paginas_lidas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.paginas_lidas, 0) > 0 THEN
    PERFORM registrar_progresso_missao(NEW.user_id, 'paginas_lidas', NEW.paginas_lidas);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_missao_leitura_progresso ON leitura_progresso;
CREATE TRIGGER trg_missao_leitura_progresso
  AFTER INSERT ON leitura_progresso
  FOR EACH ROW EXECUTE FUNCTION trg_missao_paginas_lidas();

CREATE OR REPLACE FUNCTION public.trg_missao_post_clube()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM registrar_progresso_missao(NEW.user_id, 'post_clube', 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_missao_clube_posts ON clube_posts;
CREATE TRIGGER trg_missao_clube_posts
  AFTER INSERT ON clube_posts
  FOR EACH ROW EXECUTE FUNCTION trg_missao_post_clube();

CREATE OR REPLACE FUNCTION public.trg_missao_insight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id
  FROM leituras
  WHERE id = NEW.leitura_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM registrar_progresso_missao(v_user_id, 'insight', 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_missao_leitura_conteudo ON leitura_conteudo;
CREATE TRIGGER trg_missao_leitura_conteudo
  AFTER INSERT ON leitura_conteudo
  FOR EACH ROW EXECUTE FUNCTION trg_missao_insight();

DROP TRIGGER IF EXISTS trg_missao_leitura_citacoes ON leitura_citacoes;
CREATE TRIGGER trg_missao_leitura_citacoes
  AFTER INSERT ON leitura_citacoes
  FOR EACH ROW EXECUTE FUNCTION trg_missao_insight();
