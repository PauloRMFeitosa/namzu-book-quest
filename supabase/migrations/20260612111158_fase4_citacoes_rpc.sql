
CREATE OR REPLACE FUNCTION get_minhas_citacoes()
RETURNS TABLE (
  id          uuid,
  texto       text,
  pagina      integer,
  created_at  timestamptz,
  obra_id     uuid,
  obra_titulo text,
  obra_capa   text,
  autor_nome  text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lc.id,
    lc.texto,
    lc.pagina,
    lc.created_at,
    o.id                                          AS obra_id,
    o.titulo_original                             AS obra_titulo,
    o.capa_padrao_url                             AS obra_capa,
    COALESCE(a.nome_completo, a.nome_cadastro)    AS autor_nome
  FROM leitura_citacoes lc
  JOIN leituras         l   ON l.id  = lc.leitura_id
  JOIN usuario_leituras ul  ON ul.id = l.usuario_leitura_id
  JOIN usuario_livros   ulv ON ulv.id = ul.usuario_livro_id
  JOIN obras            o   ON o.id  = ulv.obra_id
  LEFT JOIN obra_autores oa ON oa.obra_id = o.id AND oa.ordem = 1
  LEFT JOIN autores      a  ON a.id = oa.autor_id
  WHERE ulv.user_id = auth.uid()
  ORDER BY lc.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_minhas_citacoes() TO authenticated;
