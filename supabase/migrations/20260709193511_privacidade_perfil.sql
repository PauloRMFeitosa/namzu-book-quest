-- Privacidade do perfil.
-- 1) RPC para o próprio usuário alternar perfis.perfil_publico: a tabela não tem
--    política de UPDATE no RLS, então a alteração passa por função SECURITY DEFINER
--    restrita a auth.uid() e apenas a esta coluna (mesmo padrão de aceitar_termos).
CREATE OR REPLACE FUNCTION definir_perfil_publico(p_publico boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'usuário não autenticado';
  END IF;
  UPDATE perfis
  SET perfil_publico = p_publico,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION definir_perfil_publico(boolean) TO authenticated;

-- 2) Mapa de atividades anual: admins podem ver a atividade de perfis privados.
CREATE OR REPLACE FUNCTION get_atividade_leitura_anual(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (dia date, total_paginas bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(lp.data_registro, lp.created_at)::date        AS dia,
    SUM(GREATEST(1, COALESCE(lp.paginas_lidas, 0)))::bigint AS total_paginas
  FROM leitura_progresso lp
  WHERE lp.user_id = COALESCE(p_user_id, auth.uid())
    AND COALESCE(lp.data_registro, lp.created_at) >= DATE_TRUNC('year', CURRENT_DATE)
    AND (
      COALESCE(p_user_id, auth.uid()) = auth.uid()
      OR EXISTS (
        SELECT 1 FROM perfis p
        WHERE p.user_id = COALESCE(p_user_id, auth.uid())
          AND p.perfil_publico = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION get_atividade_leitura_anual(uuid) TO authenticated;
