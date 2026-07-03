
-- Remove job anterior se existir (idempotente)
SELECT cron.unschedule('renotificar-avaliacoes-dispensadas')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'renotificar-avaliacoes-dispensadas'
);

-- Agenda execução a cada hora
SELECT cron.schedule(
  'renotificar-avaliacoes-dispensadas',
  '0 * * * *',  -- todo início de hora
  $$SELECT fn_renotificar_avaliacoes_dispensadas()$$
);
