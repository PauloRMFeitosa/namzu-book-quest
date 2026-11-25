-- Fase 2 (docs/roadmap.md) — dados públicos do clube para a página de convite.
--
-- Aplicada no remoto em 25/11/2026 (versão 20261125104027).
--
-- A página /convite/:id é aberta por quem ainda não tem conta. Ela precisa
-- mostrar o clube (nome, capa, organizador, quantos membros, leitura atual)
-- antes do cadastro. As tabelas `clube_membros` e `clube_trilhas` só podem ser
-- lidas por membros, então a contagem e a leitura atual saem por esta função.
--
-- O que ela expõe é só o cartão do clube. Nada de lista de membros, posts,
-- mensagens ou progresso. Vale apenas para clubes ativos e exige o id do
-- clube, que é um UUID e só chega a quem recebeu o link.
--
-- Não altera tabela, política nem dado existente.

CREATE OR REPLACE FUNCTION public.clube_convite(p_clube_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  descricao text,
  imagem_capa_url text,
  visibilidade text,
  curador_nome text,
  curador_avatar_url text,
  membros_count integer,
  leitura_titulo text,
  leitura_capa_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.nome,
    c.descricao,
    c.imagem_capa_url,
    c.visibilidade,
    COALESCE(p.nome_exibicao, p.username)::text AS curador_nome,
    p.avatar_url AS curador_avatar_url,
    (
      SELECT count(*)::integer
      FROM public.clube_membros m
      WHERE m.clube_id = c.id AND m.status = 'ativo'
    ) AS membros_count,
    l.titulo_original AS leitura_titulo,
    l.capa_padrao_url AS leitura_capa_url
  FROM public.clubes c
  LEFT JOIN public.perfis p ON p.user_id = c.curador_id
  LEFT JOIN LATERAL (
    -- Leitura atual: a que está no período hoje; senão a próxima que ainda
    -- não terminou; senão a primeira da trilha.
    SELECT o.titulo_original, o.capa_padrao_url
    FROM public.clube_trilhas t
    JOIN public.obras o ON o.id = t.obra_id
    WHERE t.clube_id = c.id
    ORDER BY
      COALESCE(current_date BETWEEN t.data_inicio_sugerida AND t.data_fim_sugerida, false) DESC,
      (t.data_fim_sugerida IS NULL OR t.data_fim_sugerida >= current_date) DESC,
      t.ordem ASC
    LIMIT 1
  ) l ON true
  WHERE c.id = p_clube_id
    AND c.is_ativo = true;
$$;

COMMENT ON FUNCTION public.clube_convite(uuid) IS
  'Cartão público do clube para a página de convite (/convite/:id). Só clubes ativos.';

REVOKE ALL ON FUNCTION public.clube_convite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clube_convite(uuid) TO anon, authenticated, service_role;
