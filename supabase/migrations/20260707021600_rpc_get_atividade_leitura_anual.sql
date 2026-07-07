-- Atividade diária de leitura do ano corrente (mapa de atividades do perfil).
-- SECURITY DEFINER para permitir visualização em perfis públicos, já que a RLS
-- de leitura_progresso restringe SELECT ao próprio dono. Retorna apenas
-- agregados por dia; para outros usuários exige perfil_publico = true.

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
    )
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION get_atividade_leitura_anual(uuid) TO authenticated;
