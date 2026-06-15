-- Função RPC para registrar aceite dos termos de uso.
-- SECURITY DEFINER: executa como o dono da função (postgres/service role),
-- contornando a RLS que bloqueia UPDATE direto na tabela perfis pelo cliente.
CREATE OR REPLACE FUNCTION aceitar_termos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE perfis
  SET termos_aceitos_em = now()
  WHERE user_id = auth.uid();
END;
$$;
