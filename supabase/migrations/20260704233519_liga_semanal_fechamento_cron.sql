-- Fecha a liga semanal: calcula a posição final de cada membro na semana
-- encerrada. Roda toda segunda-feira 03:10 UTC (~00:10 no Brasil).
CREATE OR REPLACE FUNCTION public.fechar_liga_semanal()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_semana date := date_trunc('week', CURRENT_DATE - interval '7 days')::date;
BEGIN
  UPDATE clube_temporadas_ranking c
  SET posicao = r.pos, updated_at = now()
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY clube_id
             ORDER BY xp_na_semana DESC, updated_at ASC
           ) AS pos
    FROM clube_temporadas_ranking
    WHERE semana_inicio = v_semana
  ) r
  WHERE c.id = r.id;
END;
$fn$;

SELECT cron.schedule(
  'fechar-liga-semanal',
  '10 3 * * 1',
  $cmd$SELECT public.fechar_liga_semanal()$cmd$
);
