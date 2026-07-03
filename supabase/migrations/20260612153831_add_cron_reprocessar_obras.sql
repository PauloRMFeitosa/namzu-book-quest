
-- Remove job anterior se existir
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job WHERE jobname = 'reprocessar-obras-daily';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Conciliação Wikidata de obras — 1x por dia às 4h UTC
SELECT cron.schedule(
  'reprocessar-obras-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-obras',
    body    := '{"mode":"batch50"}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb
  ) AS request_id;
  $$
);
