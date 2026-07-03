-- Corrige "function max(boolean) does not exist" em conceder_xp:
-- troca MAX(inserted) por bool_or(inserted).
CREATE OR REPLACE FUNCTION public.conceder_xp(p_user_id uuid, p_xp integer, p_acao text, p_ref_id uuid DEFAULT NULL::uuid, p_clube_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT COALESCE(bool_or(inserted), false) INTO v_inserted FROM ins;

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
$function$;
