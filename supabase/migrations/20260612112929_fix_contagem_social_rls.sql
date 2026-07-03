
-- RPC SECURITY DEFINER para contornar RLS em conexoes (sem policies ativas)
CREATE OR REPLACE FUNCTION get_contagem_social(p_user_id uuid)
RETURNS TABLE(seguidores bigint, seguindo bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM conexoes WHERE seguido_id  = p_user_id AND status = 'ativo') AS seguidores,
    (SELECT COUNT(*) FROM conexoes WHERE seguidor_id = p_user_id AND status = 'ativo') AS seguindo;
$$;
