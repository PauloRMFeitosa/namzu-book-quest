
CREATE OR REPLACE FUNCTION get_meus_matches(p_limite int DEFAULT 20)
RETURNS TABLE (
  outro_user_id   uuid,
  compatibilidade numeric,
  motivos         jsonb,
  nome_exibicao   text,
  username        text,
  avatar_url      text,
  total_lidos     bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END AS outro_user_id,
    m.compatibilidade,
    m.motivos,
    p.nome_exibicao,
    p.username,
    p.avatar_url,
    (SELECT COUNT(*) FROM usuario_livros ul
     WHERE ul.user_id = CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END
       AND ul.status = 'lido') AS total_lidos
  FROM matches_intelectuais m
  JOIN perfis p ON p.user_id =
    CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END
  WHERE (m.user_a = auth.uid() OR m.user_b = auth.uid())
    AND m.status = 'ativo'
  ORDER BY m.compatibilidade DESC
  LIMIT p_limite;
$$;

GRANT EXECUTE ON FUNCTION get_meus_matches(int) TO authenticated;
