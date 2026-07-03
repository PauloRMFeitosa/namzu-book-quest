-- Remove a versão antiga de 4 parâmetros de conceder_xp.
-- A versão de 5 parâmetros (com p_clube_id DEFAULT NULL) cobre todas as chamadas
-- e elimina o erro "function conceder_xp(uuid, integer, unknown, uuid) is not unique".
DROP FUNCTION IF EXISTS public.conceder_xp(uuid, integer, text, uuid);
