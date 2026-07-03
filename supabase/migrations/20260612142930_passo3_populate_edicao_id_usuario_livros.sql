
-- PASSO 3A: Criar edição mínima (legado) para obras sem nenhuma edição
INSERT INTO public.edicoes (
  obra_id,
  titulo_edicao,
  editora,
  idioma,
  formato,
  fonte_dados
)
SELECT
  o.id,
  o.titulo_original,
  'Não informada',
  COALESCE(o.idioma_original, 'pt-BR'),
  'fisico_brochura',
  'legado'
FROM public.obras o
WHERE NOT EXISTS (
  SELECT 1 FROM public.edicoes e WHERE e.obra_id = o.id
)
AND EXISTS (
  SELECT 1 FROM public.usuario_livros ul WHERE ul.obra_id = o.id
);

-- PASSO 3B: Popular edicao_id em todos os usuario_livros com NULL
UPDATE public.usuario_livros ul
SET edicao_id = e.id
FROM public.edicoes e
WHERE e.obra_id = ul.obra_id
AND ul.edicao_id IS NULL;
