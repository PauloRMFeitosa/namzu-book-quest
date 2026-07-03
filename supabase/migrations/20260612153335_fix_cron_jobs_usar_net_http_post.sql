
-- Remove jobs incorretos
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('reprocessar-generos-6h', 'reprocessar-autores-3h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Job 1: Gêneros + enriquecimento de obras — a cada 6 horas
SELECT cron.schedule(
  'reprocessar-generos-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-generos',
    body    := '{"mode":"batch50"}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb
  ) AS request_id;
  $$
);

-- Job 2: Conciliação de autores — diariamente às 3h UTC
SELECT cron.schedule(
  'reprocessar-autores-3h',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-autores',
    body    := '{"mode":"batch50"}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb
  ) AS request_id;
  $$
);
