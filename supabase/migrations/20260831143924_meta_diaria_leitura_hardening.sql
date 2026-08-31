-- Hardening de segurança das funções da meta diária:
-- 1) fixa search_path do trigger
-- 2) escopa get_meta_diaria_status sempre ao próprio usuário (evita ler meta alheia)
-- 3) revoga EXECUTE de PUBLIC e concede só ao papel adequado
--    (REVOKE de anon/authenticated não basta enquanto PUBLIC mantém o grant)

ALTER FUNCTION public.fn_meta_diaria_touch_updated_at() SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_meta_diaria_status(_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid          uuid := COALESCE(_user_id, auth.uid());
  v_meta         public.metas_diarias_leitura%ROWTYPE;
  v_hoje         date;
  v_realizado    numeric := 0;
  v_streak_atual int := 0;
  v_streak_max   int := 0;
  v_cumprida     boolean := false;
  v_percentual   int := 0;
BEGIN
  -- Segurança: usuários autenticados só enxergam a própria meta.
  IF auth.uid() IS NOT NULL AND v_uid <> auth.uid() THEN
    v_uid := auth.uid();
  END IF;

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('tem_meta', false);
  END IF;

  SELECT * INTO v_meta FROM public.metas_diarias_leitura WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('tem_meta', false);
  END IF;

  v_hoje := (now() AT TIME ZONE COALESCE(NULLIF(v_meta.timezone, ''), 'America/Sao_Paulo'))::date;

  SELECT COALESCE(SUM(
           CASE WHEN v_meta.tipo_meta = 'minutos'
                THEN COALESCE(lp.tempo_leitura_minutos, 0)
                ELSE COALESCE(lp.paginas_lidas, 0)
           END), 0)
    INTO v_realizado
  FROM public.leitura_progresso lp
  WHERE lp.user_id = v_uid
    AND COALESCE(lp.data_registro, lp.created_at)::date = v_hoje;

  v_cumprida := v_realizado >= v_meta.valor_meta;
  v_percentual := LEAST(100, FLOOR((v_realizado / NULLIF(v_meta.valor_meta, 0)) * 100)::int);

  WITH dias AS (
    SELECT COALESCE(lp.data_registro, lp.created_at)::date AS dia,
           SUM(CASE WHEN v_meta.tipo_meta = 'minutos'
                    THEN COALESCE(lp.tempo_leitura_minutos, 0)
                    ELSE COALESCE(lp.paginas_lidas, 0) END) AS total
    FROM public.leitura_progresso lp
    WHERE lp.user_id = v_uid
    GROUP BY 1
  ),
  cumpridos AS (
    SELECT dia FROM dias WHERE total >= v_meta.valor_meta
  ),
  grupos AS (
    SELECT dia,
           dia - (ROW_NUMBER() OVER (ORDER BY dia))::int AS grupo
    FROM cumpridos
  ),
  ilhas AS (
    SELECT grupo, COUNT(*)::int AS tamanho, MAX(dia) AS fim
    FROM grupos
    GROUP BY grupo
  )
  SELECT
    COALESCE(MAX(tamanho), 0),
    COALESCE(MAX(tamanho) FILTER (WHERE fim >= v_hoje - 1), 0)
  INTO v_streak_max, v_streak_atual
  FROM ilhas;

  RETURN jsonb_build_object(
    'tem_meta',         true,
    'tipo_meta',        v_meta.tipo_meta,
    'valor_meta',       v_meta.valor_meta,
    'lembrete_ativo',   v_meta.lembrete_ativo,
    'lembrete_tipo',    v_meta.lembrete_tipo,
    'lembrete_horario', v_meta.lembrete_horario,
    'lembrete_turno',   v_meta.lembrete_turno,
    'canal_inapp',      v_meta.canal_inapp,
    'canal_email',      v_meta.canal_email,
    'canal_push',       v_meta.canal_push,
    'realizado_hoje',   v_realizado,
    'cumprida_hoje',    v_cumprida,
    'percentual',       v_percentual,
    'streak_atual',     v_streak_atual,
    'streak_maximo',    v_streak_max
  );
END;
$fn$;

-- Grants explícitos (revoga de PUBLIC; concede só ao papel adequado)
REVOKE EXECUTE ON FUNCTION public.get_meta_diaria_status(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_meta_diaria_status(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.registrar_leitura_rapida(integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.registrar_leitura_rapida(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lembretes_meta_diaria_pendentes() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.lembretes_meta_diaria_pendentes() TO service_role;

REVOKE EXECUTE ON FUNCTION public.marcar_lembrete_meta_enviado(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.marcar_lembrete_meta_enviado(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.processar_lembretes_meta_diaria_inapp() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.processar_lembretes_meta_diaria_inapp() TO service_role;
