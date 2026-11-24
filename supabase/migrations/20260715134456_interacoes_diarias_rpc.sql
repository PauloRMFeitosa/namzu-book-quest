-- Percentual de interação diária do usuário na plataforma.
-- Pesos por categoria (cada uma conta no máximo uma vez por dia):
--   progresso de leitura registrado = 50
--   post no feed de clube           = 25
--   livro marcado como lido         = 25 (pela data_fim, dia em que foi concluído)
CREATE OR REPLACE FUNCTION get_interacoes_diarias(
  p_user_id uuid DEFAULT NULL,
  p_dias    int  DEFAULT 30
)
RETURNS TABLE (
  dia        date,
  percentual int,
  categorias text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH interacoes AS (
    SELECT created_at::date AS dia, 'feed'::text AS categoria, 25 AS peso
    FROM clube_posts
    WHERE user_id = COALESCE(p_user_id, auth.uid())

    UNION ALL

    SELECT data_fim::date, 'livro_lido', 25
    FROM usuario_livros
    WHERE user_id = COALESCE(p_user_id, auth.uid())
      AND status IN ('lido', 'concluido')
      AND data_fim IS NOT NULL

    UNION ALL

    SELECT data_registro::date, 'progresso', 50
    FROM leitura_progresso
    WHERE user_id = COALESCE(p_user_id, auth.uid())
  ),
  por_categoria AS (
    SELECT DISTINCT dia, categoria, peso
    FROM interacoes
    WHERE dia IS NOT NULL
  )
  SELECT
    dia,
    SUM(peso)::int                                 AS percentual,
    STRING_AGG(categoria, ', ' ORDER BY categoria) AS categorias
  FROM por_categoria
  WHERE dia >= CURRENT_DATE - (p_dias - 1)
  GROUP BY dia
  ORDER BY dia DESC;
$$;

GRANT EXECUTE ON FUNCTION get_interacoes_diarias(uuid, int) TO authenticated;
