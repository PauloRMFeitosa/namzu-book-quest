
CREATE OR REPLACE FUNCTION get_livros_por_mes(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (mes text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TO_CHAR(data_fim, 'YYYY-MM') AS mes,
    COUNT(*)                     AS total
  FROM usuario_livros
  WHERE user_id  = COALESCE(p_user_id, auth.uid())
    AND status   = 'lido'
    AND data_fim >= (CURRENT_DATE - INTERVAL '11 months')
    AND data_fim IS NOT NULL
  GROUP BY TO_CHAR(data_fim, 'YYYY-MM')
  ORDER BY mes;
$$;

GRANT EXECUTE ON FUNCTION get_livros_por_mes(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_generos_lidos(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (genero text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.nome   AS genero,
    COUNT(*) AS total
  FROM usuario_livros ul
  JOIN obra_generos og ON og.obra_id = ul.obra_id
  JOIN generos      g  ON g.id       = og.genero_id
  WHERE ul.user_id = COALESCE(p_user_id, auth.uid())
    AND ul.status  = 'lido'
  GROUP BY g.nome
  ORDER BY total DESC
  LIMIT 8;
$$;

GRANT EXECUTE ON FUNCTION get_generos_lidos(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_stats_leitura(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_lidos       bigint,
  total_citacoes    bigint,
  streak_atual      int,
  paginas_estimadas bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)
     FROM usuario_livros
     WHERE user_id = COALESCE(p_user_id, auth.uid())
       AND status  = 'lido')                               AS total_lidos,

    (SELECT COUNT(*)
     FROM leitura_citacoes lc
     JOIN leituras         l   ON l.id   = lc.leitura_id
     JOIN usuario_leituras ul  ON ul.id  = l.usuario_leitura_id
     JOIN usuario_livros   ulv ON ulv.id = ul.usuario_livro_id
     WHERE ulv.user_id = COALESCE(p_user_id, auth.uid())) AS total_citacoes,

    -- Streak simples: número de meses distintos com pelo menos 1 livro lido
    (SELECT COUNT(DISTINCT DATE_TRUNC('month', data_fim))::int
     FROM usuario_livros
     WHERE user_id  = COALESCE(p_user_id, auth.uid())
       AND status   = 'lido'
       AND data_fim >= CURRENT_DATE - INTERVAL '12 months'
       AND data_fim IS NOT NULL)                           AS streak_atual,

    (SELECT COUNT(*) * 300
     FROM usuario_livros
     WHERE user_id = COALESCE(p_user_id, auth.uid())
       AND status  = 'lido')                               AS paginas_estimadas;
$$;

GRANT EXECUTE ON FUNCTION get_stats_leitura(uuid) TO authenticated;
