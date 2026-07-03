-- ================================================================
-- Fase 2: Schema — colunas novas + tabelas novas
-- ================================================================

ALTER TABLE gamificacao_perfis
  ADD COLUMN IF NOT EXISTS streak_freezes_disponiveis  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freezes_usados_total integer NOT NULL DEFAULT 0;

ALTER TABLE conquistas
  ADD COLUMN IF NOT EXISTS raridade        text NOT NULL DEFAULT 'comum',
  ADD COLUMN IF NOT EXISTS meta_valor      integer,
  ADD COLUMN IF NOT EXISTS meta_categoria  text;

ALTER TABLE conquistas
  ADD CONSTRAINT conquistas_raridade_check
  CHECK (raridade IN ('comum', 'rara', 'epica', 'legendaria'));

UPDATE conquistas SET meta_valor = 1,   meta_categoria = 'leitura'             WHERE codigo = 'leitura_1';
UPDATE conquistas SET meta_valor = 5,   meta_categoria = 'leitura'             WHERE codigo = 'leitura_5';
UPDATE conquistas SET meta_valor = 10,  meta_categoria = 'leitura'             WHERE codigo = 'leitura_10';
UPDATE conquistas SET meta_valor = 50,  meta_categoria = 'leitura'             WHERE codigo = 'leitura_50';
UPDATE conquistas SET meta_valor = 100, meta_categoria = 'leitura'             WHERE codigo = 'leitura_100';
UPDATE conquistas SET meta_valor = 7,   meta_categoria = 'consistencia'        WHERE codigo = 'consistencia_7';
UPDATE conquistas SET meta_valor = 30,  meta_categoria = 'consistencia'        WHERE codigo = 'consistencia_30';
UPDATE conquistas SET meta_valor = 100, meta_categoria = 'consistencia'        WHERE codigo = 'consistencia_100';
UPDATE conquistas SET meta_valor = 1,   meta_categoria = 'conhecimento'        WHERE codigo = 'conhecimento_1';
UPDATE conquistas SET meta_valor = 10,  meta_categoria = 'conhecimento'        WHERE codigo = 'conhecimento_10';
UPDATE conquistas SET meta_valor = 100, meta_categoria = 'conhecimento'        WHERE codigo = 'conhecimento_100';
UPDATE conquistas SET meta_valor = 1,   meta_categoria = 'comunidade_clubes'   WHERE codigo = 'comunidade_1';
UPDATE conquistas SET meta_valor = 50,  meta_categoria = 'comunidade_posts'    WHERE codigo = 'comunidade_50';
UPDATE conquistas SET meta_valor = 500, meta_categoria = 'comunidade_curtidas' WHERE codigo = 'comunidade_500';

UPDATE conquistas SET raridade = 'comum'
  WHERE codigo IN ('leitura_1','conhecimento_1','comunidade_1','consistencia_7');
UPDATE conquistas SET raridade = 'rara'
  WHERE codigo IN ('leitura_5','conhecimento_10','comunidade_50','consistencia_30');
UPDATE conquistas SET raridade = 'epica'
  WHERE codigo IN ('leitura_10','conhecimento_100','comunidade_500','consistencia_100');
UPDATE conquistas SET raridade = 'legendaria'
  WHERE codigo IN ('leitura_50','leitura_100');

CREATE TABLE IF NOT EXISTS clube_temporadas_ranking (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clube_id      uuid NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  semana_inicio date NOT NULL,
  semana_fim    date NOT NULL,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_na_semana  integer NOT NULL DEFAULT 0,
  posicao       integer,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (clube_id, semana_inicio, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ctr_clube_semana ON clube_temporadas_ranking (clube_id, semana_inicio);

CREATE TABLE IF NOT EXISTS clube_gamificacao (
  clube_id         uuid PRIMARY KEY REFERENCES clubes(id) ON DELETE CASCADE,
  xp_total         integer NOT NULL DEFAULT 0,
  nivel            integer NOT NULL DEFAULT 1,
  xp_proximo_nivel integer NOT NULL DEFAULT 500,
  updated_at       timestamptz DEFAULT now()
);

INSERT INTO app_settings (key, value)
VALUES ('show_gamificacao_clube', 'false')
ON CONFLICT (key) DO NOTHING;

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
  v_xp_total       int;
  v_nivel          int;
  v_xp_proximo     int;
  v_inserted       boolean := false;
  v_streak_atual   int;
  v_freezes        int;
  v_ultima_data    date;
  v_streak_novo    int;
  v_freeze_usado   boolean := false;
  v_semana_inicio  date;
BEGIN
  INSERT INTO gamificacao_perfis (user_id, xp_total, nivel, xp_proximo_nivel, ultima_atividade_date)
  VALUES (p_user_id, 0, 1, 100, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

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

  SELECT streak_atual, streak_freezes_disponiveis, ultima_atividade_date
  INTO v_streak_atual, v_freezes, v_ultima_data
  FROM gamificacao_perfis
  WHERE user_id = p_user_id;

  IF v_ultima_data = CURRENT_DATE THEN
    v_streak_novo := v_streak_atual;
  ELSIF v_ultima_data = CURRENT_DATE - 1 THEN
    v_streak_novo := v_streak_atual + 1;
  ELSIF v_freezes > 0 AND v_ultima_data = CURRENT_DATE - 2 THEN
    v_streak_novo  := v_streak_atual + 1;
    v_freeze_usado := true;
  ELSE
    v_streak_novo := 1;
  END IF;

  UPDATE gamificacao_perfis
  SET
    xp_total              = xp_total + p_xp,
    ultima_atividade_date = CURRENT_DATE,
    streak_atual          = v_streak_novo,
    streak_maximo         = GREATEST(streak_maximo, v_streak_novo),
    streak_freezes_disponiveis  = CASE WHEN v_freeze_usado
                                    THEN streak_freezes_disponiveis - 1
                                    ELSE streak_freezes_disponiveis END,
    streak_freezes_usados_total = CASE WHEN v_freeze_usado
                                    THEN streak_freezes_usados_total + 1
                                    ELSE streak_freezes_usados_total END,
    updated_at            = now()
  WHERE user_id = p_user_id
  RETURNING xp_total, nivel, xp_proximo_nivel
  INTO v_xp_total, v_nivel, v_xp_proximo;

  WHILE v_xp_total >= v_xp_proximo LOOP
    v_nivel      := v_nivel + 1;
    v_xp_proximo := ROUND(v_xp_proximo * 1.5);
    UPDATE gamificacao_perfis
    SET nivel = v_nivel, xp_proximo_nivel = v_xp_proximo, updated_at = now()
    WHERE user_id = p_user_id;
  END LOOP;

  IF p_clube_id IS NOT NULL THEN
    v_semana_inicio := date_trunc('week', CURRENT_DATE)::date;

    INSERT INTO clube_temporadas_ranking
      (clube_id, semana_inicio, semana_fim, user_id, xp_na_semana)
    VALUES
      (p_clube_id, v_semana_inicio, v_semana_inicio + 6, p_user_id, p_xp)
    ON CONFLICT (clube_id, semana_inicio, user_id) DO UPDATE
      SET xp_na_semana = clube_temporadas_ranking.xp_na_semana + p_xp,
          updated_at   = now();

    INSERT INTO clube_gamificacao (clube_id, xp_total)
    VALUES (p_clube_id, p_xp)
    ON CONFLICT (clube_id) DO UPDATE
      SET xp_total   = clube_gamificacao.xp_total + p_xp,
          updated_at = now();

    PERFORM refresh_ranking();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_gamificacao_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.streak_atual >= 7   THEN PERFORM desbloquear_conquista(NEW.user_id, 'consistencia_7');   END IF;
  IF NEW.streak_atual >= 30  THEN PERFORM desbloquear_conquista(NEW.user_id, 'consistencia_30');  END IF;
  IF NEW.streak_atual >= 100 THEN PERFORM desbloquear_conquista(NEW.user_id, 'consistencia_100'); END IF;

  IF NEW.streak_atual IN (7, 30, 100) AND
     (OLD.streak_atual IS NULL OR OLD.streak_atual < NEW.streak_atual) THEN
    UPDATE gamificacao_perfis
    SET streak_freezes_disponiveis = streak_freezes_disponiveis + 1
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;
