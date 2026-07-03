-- Feed de atividade: passa a retornar também o autor principal da obra
-- (autor_id e autor_nome) para permitir navegação até a página do autor
-- a partir da Home. Autor principal = menor "ordem" em obra_autores.
-- O tipo de retorno muda, então a função precisa ser removida e recriada.

DROP FUNCTION IF EXISTS public.feed_atividade(int);

CREATE FUNCTION public.feed_atividade(p_limite int DEFAULT 50)
RETURNS TABLE (
  tipo            text,
  ator_id         uuid,
  ator_nome       text,
  ator_username   text,
  ator_avatar     text,
  referencia_id   uuid,
  referencia_nome text,
  referencia_capa text,
  autor_id        uuid,
  autor_nome      text,
  ocorreu_em      timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Livros adicionados (quero_ler)
  SELECT
    'livro_adicionado'          AS tipo,
    ul.user_id                  AS ator_id,
    p.nome_exibicao             AS ator_nome,
    p.username                  AS ator_username,
    p.avatar_url                AS ator_avatar,
    ul.obra_id                  AS referencia_id,
    o.titulo_original           AS referencia_nome,
    o.capa_padrao_url           AS referencia_capa,
    autor.id                    AS autor_id,
    autor.nome_completo         AS autor_nome,
    ul.created_at               AS ocorreu_em
  FROM usuario_livros ul
  JOIN perfis p ON p.user_id = ul.user_id
  JOIN obras  o ON o.id      = ul.obra_id
  LEFT JOIN LATERAL (
    SELECT a.id, a.nome_completo
    FROM obra_autores oa
    JOIN autores a ON a.id = oa.autor_id
    WHERE oa.obra_id = o.id
    ORDER BY oa.ordem NULLS LAST
    LIMIT 1
  ) autor ON true
  WHERE ul.status = 'quero_ler'
    AND ul.user_id IN (
      SELECT seguido_id FROM conexoes
      WHERE seguidor_id = auth.uid() AND status = 'ativo'
    )
    AND ul.created_at >= now() - interval '30 days'

  UNION ALL

  -- Livros iniciados
  SELECT
    'livro_iniciado',
    ul.user_id,
    p.nome_exibicao,
    p.username,
    p.avatar_url,
    ul.obra_id,
    o.titulo_original,
    o.capa_padrao_url,
    autor.id,
    autor.nome_completo,
    ul.updated_at
  FROM usuario_livros ul
  JOIN perfis p ON p.user_id = ul.user_id
  JOIN obras  o ON o.id      = ul.obra_id
  LEFT JOIN LATERAL (
    SELECT a.id, a.nome_completo
    FROM obra_autores oa
    JOIN autores a ON a.id = oa.autor_id
    WHERE oa.obra_id = o.id
    ORDER BY oa.ordem NULLS LAST
    LIMIT 1
  ) autor ON true
  WHERE ul.status = 'lendo'
    AND ul.user_id IN (
      SELECT seguido_id FROM conexoes
      WHERE seguidor_id = auth.uid() AND status = 'ativo'
    )
    AND ul.updated_at >= now() - interval '30 days'

  UNION ALL

  -- Livros concluídos
  SELECT
    'livro_concluido',
    ul.user_id,
    p.nome_exibicao,
    p.username,
    p.avatar_url,
    ul.obra_id,
    o.titulo_original,
    o.capa_padrao_url,
    autor.id,
    autor.nome_completo,
    COALESCE(ul.data_fim::timestamptz, ul.updated_at)
  FROM usuario_livros ul
  JOIN perfis p ON p.user_id = ul.user_id
  JOIN obras  o ON o.id      = ul.obra_id
  LEFT JOIN LATERAL (
    SELECT a.id, a.nome_completo
    FROM obra_autores oa
    JOIN autores a ON a.id = oa.autor_id
    WHERE oa.obra_id = o.id
    ORDER BY oa.ordem NULLS LAST
    LIMIT 1
  ) autor ON true
  WHERE ul.status IN ('concluido', 'lido')
    AND ul.user_id IN (
      SELECT seguido_id FROM conexoes
      WHERE seguidor_id = auth.uid() AND status = 'ativo'
    )
    AND ul.updated_at >= now() - interval '30 days'

  UNION ALL

  -- Conquistas desbloqueadas (sem obra, autor nulo)
  SELECT
    'conquista_desbloqueada',
    uc.user_id,
    p.nome_exibicao,
    p.username,
    p.avatar_url,
    c.id,
    c.nome,
    null::text,
    null::uuid,
    null::text,
    uc.desbloqueado_em
  FROM usuario_conquistas uc
  JOIN perfis    p ON p.user_id    = uc.user_id
  JOIN conquistas c ON c.id        = uc.conquista_id
  WHERE uc.user_id IN (
      SELECT seguido_id FROM conexoes
      WHERE seguidor_id = auth.uid() AND status = 'ativo'
    )
    AND uc.desbloqueado_em >= now() - interval '30 days'

  ORDER BY ocorreu_em DESC
  LIMIT p_limite;
$$;

-- Mesma política de acesso da migração 20260703145519: função SECURITY
-- DEFINER pessoal, só faz sentido autenticada.
REVOKE EXECUTE ON FUNCTION public.feed_atividade(int) FROM public;
REVOKE EXECUTE ON FUNCTION public.feed_atividade(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.feed_atividade(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_atividade(int) TO service_role;
