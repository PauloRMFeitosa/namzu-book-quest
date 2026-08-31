-- Meta Diária de Leitura (hábito estilo Duolingo)
-- ------------------------------------------------------------------------
-- O leitor define uma meta diária (X minutos OU X páginas por dia), escolhe
-- um horário/turno para ser lembrado e ativa os canais de lembrete (in-app,
-- e-mail e/ou push). Um job agendado (pg_cron) envia lembretes quando a meta
-- do dia ainda não foi cumprida no horário escolhido, estimulando a leitura.
--
-- Progresso do dia é derivado de leitura_progresso (soma de tempo_leitura_minutos
-- ou paginas_lidas por dia), então qualquer leitura registrada no app conta.

-- ─── Tabela: configuração da meta diária (uma por usuário) ────────────────
CREATE TABLE IF NOT EXISTS public.metas_diarias_leitura (
  user_id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  tipo_meta        text NOT NULL DEFAULT 'minutos'
                     CHECK (tipo_meta IN ('minutos', 'paginas')),
  valor_meta       integer NOT NULL DEFAULT 10 CHECK (valor_meta > 0 AND valor_meta <= 1000),
  lembrete_ativo   boolean NOT NULL DEFAULT true,
  lembrete_tipo    text NOT NULL DEFAULT 'turno'
                     CHECK (lembrete_tipo IN ('horario', 'turno')),
  lembrete_horario time,
  lembrete_turno   text CHECK (lembrete_turno IN ('manha', 'tarde', 'noite')),
  timezone         text NOT NULL DEFAULT 'America/Sao_Paulo',
  canal_inapp      boolean NOT NULL DEFAULT true,
  canal_email      boolean NOT NULL DEFAULT false,
  canal_push       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Garante que o alvo do lembrete esteja preenchido conforme o tipo escolhido
  CONSTRAINT lembrete_alvo_valido CHECK (
    (lembrete_tipo = 'horario' AND lembrete_horario IS NOT NULL)
    OR (lembrete_tipo = 'turno' AND lembrete_turno IS NOT NULL)
  )
);

COMMENT ON TABLE public.metas_diarias_leitura IS
  'Configuração da meta diária de leitura (hábito) de cada usuário.';

-- ─── Tabela: inscrições de Web Push (uma por dispositivo/navegador) ────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

COMMENT ON TABLE public.push_subscriptions IS
  'Inscrições de Web Push por dispositivo, usadas para lembretes de leitura.';

-- ─── Tabela: log de lembretes enviados (idempotência por dia/canal) ───────
CREATE TABLE IF NOT EXISTS public.meta_lembretes_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dia        date NOT NULL,
  canal      text NOT NULL CHECK (canal IN ('inapp', 'email', 'push')),
  enviado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dia, canal)
);

CREATE INDEX IF NOT EXISTS idx_meta_lembretes_log_dia
  ON public.meta_lembretes_log (dia);

COMMENT ON TABLE public.meta_lembretes_log IS
  'Registro de lembretes de meta diária já enviados, para não duplicar por dia/canal.';

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.metas_diarias_leitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_lembretes_log   ENABLE ROW LEVEL SECURITY;

-- metas_diarias_leitura: cada usuário gerencia a própria meta
DROP POLICY IF EXISTS "meta_diaria_select_own" ON public.metas_diarias_leitura;
CREATE POLICY "meta_diaria_select_own" ON public.metas_diarias_leitura
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meta_diaria_insert_own" ON public.metas_diarias_leitura;
CREATE POLICY "meta_diaria_insert_own" ON public.metas_diarias_leitura
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meta_diaria_update_own" ON public.metas_diarias_leitura;
CREATE POLICY "meta_diaria_update_own" ON public.metas_diarias_leitura
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meta_diaria_delete_own" ON public.metas_diarias_leitura;
CREATE POLICY "meta_diaria_delete_own" ON public.metas_diarias_leitura
  FOR DELETE USING (auth.uid() = user_id);

-- push_subscriptions: cada usuário gerencia as próprias inscrições
DROP POLICY IF EXISTS "push_sub_select_own" ON public.push_subscriptions;
CREATE POLICY "push_sub_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_sub_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_sub_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_sub_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_sub_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- meta_lembretes_log: somente leitura do próprio log (escrita via funções definer)
DROP POLICY IF EXISTS "meta_log_select_own" ON public.meta_lembretes_log;
CREATE POLICY "meta_log_select_own" ON public.meta_lembretes_log
  FOR SELECT USING (auth.uid() = user_id);

-- ─── updated_at automático ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_meta_diaria_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_diaria_updated_at ON public.metas_diarias_leitura;
CREATE TRIGGER trg_meta_diaria_updated_at
  BEFORE UPDATE ON public.metas_diarias_leitura
  FOR EACH ROW EXECUTE FUNCTION public.fn_meta_diaria_touch_updated_at();

-- ─── RPC: status da meta diária do usuário (progresso + streak) ───────────
-- Retorna um objeto JSON consumido pelo card da meta diária no frontend.
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
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('tem_meta', false);
  END IF;

  SELECT * INTO v_meta FROM public.metas_diarias_leitura WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('tem_meta', false);
  END IF;

  v_hoje := (now() AT TIME ZONE COALESCE(NULLIF(v_meta.timezone, ''), 'America/Sao_Paulo'))::date;

  -- Realizado hoje conforme a métrica da meta
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

  -- Streak: dias consecutivos cumpridos (ilhas de datas contíguas)
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

REVOKE EXECUTE ON FUNCTION public.get_meta_diaria_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_meta_diaria_status(uuid) TO authenticated;

-- ─── RPC: registro rápido de leitura do dia (quick-log do hábito) ─────────
-- Insere uma sessão avulsa em leitura_progresso (sem livro específico) para
-- contabilizar minutos/páginas lidos no dia diretamente pelo card da meta.
CREATE OR REPLACE FUNCTION public.registrar_leitura_rapida(
  _minutos integer DEFAULT NULL,
  _paginas integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_min int := GREATEST(0, COALESCE(_minutos, 0));
  v_pag int := GREATEST(0, COALESCE(_paginas, 0));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF v_min = 0 AND v_pag = 0 THEN
    RAISE EXCEPTION 'informe minutos ou páginas';
  END IF;

  INSERT INTO public.leitura_progresso (user_id, leitura_id, paginas_lidas, tempo_leitura_minutos, data_registro)
  VALUES (v_uid, NULL, NULLIF(v_pag, 0), NULLIF(v_min, 0), CURRENT_DATE);

  RETURN public.get_meta_diaria_status(v_uid);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.registrar_leitura_rapida(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_leitura_rapida(integer, integer) TO authenticated;

-- ─── Função interna: lembretes pendentes agora (todos os canais) ──────────
-- Expande uma linha por (usuário, canal) que está devendo lembrete neste
-- instante: lembrete ativo, horário/turno já passou no fuso do usuário, meta
-- do dia ainda não cumprida e canal ainda não notificado hoje.
CREATE OR REPLACE FUNCTION public.lembretes_meta_diaria_pendentes()
RETURNS TABLE (
  user_id    uuid,
  canal      text,
  tipo_meta  text,
  valor_meta integer,
  realizado  numeric,
  faltante   numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH base AS (
    SELECT
      m.*,
      (now() AT TIME ZONE COALESCE(NULLIF(m.timezone, ''), 'America/Sao_Paulo'))::date AS local_date,
      (now() AT TIME ZONE COALESCE(NULLIF(m.timezone, ''), 'America/Sao_Paulo'))::time AS local_time,
      CASE
        WHEN m.lembrete_tipo = 'horario' THEN m.lembrete_horario
        WHEN m.lembrete_turno = 'manha'  THEN TIME '08:00'
        WHEN m.lembrete_turno = 'tarde'  THEN TIME '13:00'
        WHEN m.lembrete_turno = 'noite'  THEN TIME '19:00'
      END AS due_time
    FROM public.metas_diarias_leitura m
    WHERE m.lembrete_ativo = true
  ),
  progresso AS (
    SELECT b.user_id,
           COALESCE(SUM(
             CASE WHEN b.tipo_meta = 'minutos'
                  THEN COALESCE(lp.tempo_leitura_minutos, 0)
                  ELSE COALESCE(lp.paginas_lidas, 0) END), 0) AS realizado
    FROM base b
    LEFT JOIN public.leitura_progresso lp
      ON lp.user_id = b.user_id
     AND COALESCE(lp.data_registro, lp.created_at)::date = b.local_date
    GROUP BY b.user_id
  ),
  devendo AS (
    SELECT b.user_id, b.tipo_meta, b.valor_meta, b.local_date,
           b.canal_inapp, b.canal_email, b.canal_push,
           p.realizado
    FROM base b
    JOIN progresso p ON p.user_id = b.user_id
    WHERE b.due_time IS NOT NULL
      AND b.local_time >= b.due_time
      AND p.realizado < b.valor_meta
  ),
  canais AS (
    SELECT d.user_id, d.tipo_meta, d.valor_meta, d.local_date, d.realizado,
           c.canal
    FROM devendo d
    CROSS JOIN LATERAL (VALUES
      ('inapp', d.canal_inapp),
      ('email', d.canal_email),
      ('push',  d.canal_push)
    ) AS c(canal, ativo)
    WHERE c.ativo = true
  )
  SELECT c.user_id, c.canal, c.tipo_meta, c.valor_meta,
         c.realizado, (c.valor_meta - c.realizado) AS faltante
  FROM canais c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.meta_lembretes_log l
    WHERE l.user_id = c.user_id
      AND l.dia = c.local_date
      AND l.canal = c.canal
  );
$fn$;

REVOKE EXECUTE ON FUNCTION public.lembretes_meta_diaria_pendentes() FROM anon, authenticated;

-- ─── Função interna: marca lembrete como enviado (idempotente) ────────────
CREATE OR REPLACE FUNCTION public.marcar_lembrete_meta_enviado(_user_id uuid, _canal text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  INSERT INTO public.meta_lembretes_log (user_id, dia, canal)
  SELECT _user_id,
         (now() AT TIME ZONE COALESCE(
            NULLIF((SELECT timezone FROM public.metas_diarias_leitura WHERE user_id = _user_id), ''),
            'America/Sao_Paulo'))::date,
         _canal
  ON CONFLICT (user_id, dia, canal) DO NOTHING;
$fn$;

REVOKE EXECUTE ON FUNCTION public.marcar_lembrete_meta_enviado(uuid, text) FROM anon, authenticated;

-- ─── Job SQL: processa lembretes IN-APP (autossuficiente, sem infra externa) ──
-- Cria uma notificação in-app para cada usuário devendo o canal 'inapp' e
-- registra no log para não duplicar. E-mail e push são tratados pela edge
-- function 'enviar-lembretes-meta'.
CREATE OR REPLACE FUNCTION public.processar_lembretes_meta_diaria_inapp()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r record;
  v_count int := 0;
  v_frases text[] := ARRAY[
    'Que tal alguns minutos de leitura agora? Sua sequência agradece! 🔥',
    'Ainda dá tempo de bater sua meta de hoje. Bora ler? 📖',
    'Seu livro está esperando por você. Uma página já é um começo!',
    'Não perca sua ofensiva! Leia um pouquinho antes de dormir. ✨',
    'Pequenos hábitos, grandes histórias. Vamos para a leitura de hoje?'
  ];
BEGIN
  FOR r IN SELECT * FROM public.lembretes_meta_diaria_pendentes() WHERE canal = 'inapp'
  LOOP
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, link_url)
    VALUES (
      r.user_id,
      'meta_diaria_lembrete',
      'Sua meta de leitura de hoje',
      v_frases[1 + floor(random() * array_length(v_frases, 1))::int],
      '/metas'
    );
    PERFORM public.marcar_lembrete_meta_enviado(r.user_id, 'inapp');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.processar_lembretes_meta_diaria_inapp() FROM anon, authenticated;

-- ─── Agendamento (pg_cron) ────────────────────────────────────────────────
-- Roda a cada 15 minutos. Cada meta só é lembrada uma vez por dia por canal
-- (garantido pelo log), então rodar com frequência apenas aproxima o envio
-- do horário escolhido pelo usuário.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('lembretes-meta-diaria-inapp')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembretes-meta-diaria-inapp');
    PERFORM cron.schedule(
      'lembretes-meta-diaria-inapp',
      '*/15 * * * *',
      $cmd$SELECT public.processar_lembretes_meta_diaria_inapp()$cmd$
    );
  END IF;
END;
$do$;

-- ─── Realtime para o card reagir a novas notificações (já habilitado para
-- notificacoes em migração anterior). Nada a fazer aqui.

-- ------------------------------------------------------------------------
-- WIRING DOS CANAIS E-MAIL/PUSH (opcional, exige secrets do projeto)
-- ------------------------------------------------------------------------
-- A edge function `enviar-lembretes-meta` envia e-mail (Resend) e Web Push
-- (VAPID) para os canais 'email' e 'push'. Para dispará-la a cada 15 min,
-- agende no pg_cron usando pg_net, substituindo <PROJECT_REF> e o token:
--
--   SELECT cron.schedule(
--     'lembretes-meta-diaria-email-push',
--     '*/15 * * * *',
--     $$
--       SELECT net.http_post(
--         url     := 'https://<PROJECT_REF>.functions.supabase.co/enviar-lembretes-meta',
--         headers := jsonb_build_object(
--                      'Content-Type', 'application/json',
--                      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
--                    ),
--         body    := '{}'::jsonb
--       );
--     $$
--   );
--
-- Secrets necessários (Supabase → Edge Functions → Secrets):
--   RESEND_API_KEY, EMAIL_FROM         (canal e-mail)
--   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   (canal push)
--   LEMBRETES_CRON_SECRET              (protege a invocação da função)
