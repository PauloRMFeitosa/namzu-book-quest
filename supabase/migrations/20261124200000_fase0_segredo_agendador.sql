-- Fase 0 (docs/roadmap.md) — segredo do agendador para as Edge Functions de lote.
--
-- Problema (docs/auditoria-edge-functions-2026-11.md): o pg_cron chama quatro
-- Edge Functions sem credencial. Para o job funcionar, a `reprocessar-generos`
-- ficou sem nenhuma checagem de quem chama, e qualquer pessoa na internet
-- conseguia disparar o lote. A `reprocessar-autores` exigia admin, então o job
-- dela recebia 401 toda madrugada.
--
-- Solução: um segredo gerado aqui, dentro do banco, guardado no Vault.
--   - Os jobs do pg_cron leem o segredo do Vault e o enviam no cabeçalho
--     `x-cron-secret`.
--   - As funções chamam `verificar_segredo_cron` para conferir o valor.
-- O segredo nunca sai do banco: não fica em variável de ambiente, no código,
-- nem no texto do comando do job (que guarda só a subconsulta).
--
-- Ordem segura: esta migração vem ANTES da publicação das funções. Enquanto as
-- funções antigas estão no ar, elas simplesmente ignoram o cabeçalho novo.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Segredo no Vault (só cria se ainda não existir)
-- ───────────────────────────────────────────────────────────────────────────
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'cron_secret',
      'Segredo que o pg_cron envia às Edge Functions de lote no cabeçalho x-cron-secret'
    );
  END IF;
END;
$do$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Conferência do segredo, chamada pelas Edge Functions com a chave de serviço
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verificar_segredo_cron(p_segredo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT length(coalesce(p_segredo, '')) >= 32
     AND EXISTS (
       SELECT 1
       FROM vault.decrypted_secrets s
       WHERE s.name = 'cron_secret'
         AND s.decrypted_secret = p_segredo
     );
$fn$;

REVOKE EXECUTE ON FUNCTION public.verificar_segredo_cron(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.verificar_segredo_cron(text) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Jobs do pg_cron passam a enviar o segredo
-- ───────────────────────────────────────────────────────────────────────────
-- Mesmos nomes, horários e corpos de antes; `cron.schedule` com nome existente
-- atualiza o job. O job de lembretes deixa de carregar um token em texto puro.

SELECT cron.schedule('reprocessar-generos-6h', '0 */6 * * *', $cmd$
  SELECT net.http_post(
    url     := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-generos',
    body    := '{"mode":"batch50"}'::jsonb,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
               )
  ) AS request_id;
$cmd$);

SELECT cron.schedule('reprocessar-autores-3h', '0 3 * * *', $cmd$
  SELECT net.http_post(
    url     := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-autores',
    body    := '{"mode":"batch50"}'::jsonb,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
               )
  ) AS request_id;
$cmd$);

SELECT cron.schedule('reprocessar-obras-daily', '0 4 * * *', $cmd$
  SELECT net.http_post(
    url     := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/reprocessar-obras',
    body    := '{"mode":"batch50"}'::jsonb,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
               )
  ) AS request_id;
$cmd$);

SELECT cron.schedule('lembretes-meta-diaria-email-push', '*/15 * * * *', $cmd$
  SELECT net.http_post(
    url     := 'https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/enviar-lembretes-meta',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
               )
  ) AS request_id;
$cmd$);
