
-- ============================================================
-- Feed de atividade social — retorna eventos das últimas 30 dias
-- de usuários que o usuário atual segue
-- ============================================================
CREATE TYPE public.feed_tipo AS ENUM (
  'livro_adicionado',
  'livro_iniciado',
  'livro_concluido',
  'conquista_desbloqueada'
);

CREATE OR REPLACE FUNCTION public.feed_atividade(p_limite int DEFAULT 50)
RETURNS TABLE (
  tipo            text,
  ator_id         uuid,
  ator_nome       text,
  ator_username   text,
  ator_avatar     text,
  referencia_id   uuid,
  referencia_nome text,
  referencia_capa text,
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
    ul.created_at               AS ocorreu_em
  FROM usuario_livros ul
  JOIN perfis p ON p.user_id = ul.user_id
  JOIN obras  o ON o.id      = ul.obra_id
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
    ul.updated_at
  FROM usuario_livros ul
  JOIN perfis p ON p.user_id = ul.user_id
  JOIN obras  o ON o.id      = ul.obra_id
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
    COALESCE(ul.data_fim::timestamptz, ul.updated_at)
  FROM usuario_livros ul
  JOIN perfis p ON p.user_id = ul.user_id
  JOIN obras  o ON o.id      = ul.obra_id
  WHERE ul.status IN ('concluido', 'lido')
    AND ul.user_id IN (
      SELECT seguido_id FROM conexoes
      WHERE seguidor_id = auth.uid() AND status = 'ativo'
    )
    AND ul.updated_at >= now() - interval '30 days'

  UNION ALL

  -- Conquistas desbloqueadas
  SELECT
    'conquista_desbloqueada',
    uc.user_id,
    p.nome_exibicao,
    p.username,
    p.avatar_url,
    c.id,
    c.nome,
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

GRANT EXECUTE ON FUNCTION public.feed_atividade(int) TO authenticated;
