
-- ============================================================
-- #34: Trigger BEFORE UPDATE em autores
-- Reseta status_conciliacao → 'pendente' quando nome muda
-- (INSERT já coberto por DEFAULT 'pendente')
-- ============================================================

CREATE OR REPLACE FUNCTION trg_fn_autor_reset_conciliacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.nome_completo IS DISTINCT FROM NEW.nome_completo THEN
    NEW.status_conciliacao    := 'pendente';
    NEW.tentativas_conciliacao := 0;
    NEW.data_ultima_conciliacao := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autor_reset_conciliacao ON autores;
CREATE TRIGGER trg_autor_reset_conciliacao
  BEFORE UPDATE ON autores
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_autor_reset_conciliacao();

-- ============================================================
-- #35a: pg_net (HTTP async — necessário para cron chamar functions)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- #35b: pg_cron jobs — enriquecimento automático
-- ============================================================

-- Remove jobs anteriores com mesmo nome (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('reprocessar-generos-6h', 'reprocessar-autores-3h');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Job 1: Gêneros + enriquecimento de obra — a cada 6 horas
SELECT cron.schedule(
  'reprocessar-generos-6h',
  '0 */6 * * *',
  $$
  SELECT extensions.http_post(
    url  := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-generos',
    data := '{"mode":"batch50"}'
  )
  $$
);

-- Job 2: Conciliação de autores — diariamente às 3h UTC
SELECT cron.schedule(
  'reprocessar-autores-3h',
  '0 3 * * *',
  $$
  SELECT extensions.http_post(
    url  := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-autores',
    data := '{"mode":"batch50"}'
  )
  $$
);
