-- Página pública do clube (docs/pagina-publica.md).
--
-- O organizador escolhe um endereço para o clube e liga a página pública, que
-- abre sem login em namzu.com.br/c/<endereco> e em <endereco>.namzu.com.br.
--
-- Regras:
--   - A página só existe quando o organizador liga (`pagina_publica`) e o
--     clube está ativo. Desligada, o endereço responde "não encontrado".
--   - Só quem criou o clube e admins definem o endereço e ligam a página.
--   - A página mostra só o que serve para divulgar: nome, descrição, objetivo,
--     capa, organizador, número de membros, livros da trilha e data e título
--     dos próximos encontros. Não mostra membros, conversas, link de encontro
--     nem conteúdo do clube.
--   - Clube privado pode ter página pública: a entrada continua dependendo da
--     aprovação do organizador.
--
-- Em `clubes`, só acrescenta duas colunas; nenhum dado existente muda.

ALTER TABLE public.clubes
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS pagina_publica boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clubes.endereco IS
  'Nome do clube no endereço público: namzu.com.br/c/<endereco> e <endereco>.namzu.com.br.';
COMMENT ON COLUMN public.clubes.pagina_publica IS
  'Página pública ligada pelo organizador. Só vale com endereço definido e clube ativo.';

-- Nomes que não podem virar endereço de clube (a mesma lista está em src/lib/enderecoClube.ts).
CREATE OR REPLACE FUNCTION public.clube_endereco_reservado(p_endereco text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_endereco = ANY (ARRAY[
    'www','app','api','admin','blog','mail','email','ftp','cdn','static','assets','status','dev','teste','staging','docs',
    'namzu','suporte','ajuda','contato','login','signup','cadastro','entrar','sair','conta','perfil',
    'clube','clubes','convite','painel','planos','precos','pagamento','loja','termos','privacidade','sobre'
  ]);
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clubes_endereco_formato') THEN
    ALTER TABLE public.clubes ADD CONSTRAINT clubes_endereco_formato
      CHECK (endereco IS NULL OR (endereco ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(endereco) BETWEEN 3 AND 40));
  END IF;
  -- Vale também para quem alterar a tabela direto, sem passar pela função.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clubes_endereco_nao_reservado') THEN
    ALTER TABLE public.clubes ADD CONSTRAINT clubes_endereco_nao_reservado
      CHECK (endereco IS NULL OR NOT public.clube_endereco_reservado(endereco));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clubes_pagina_pede_endereco') THEN
    ALTER TABLE public.clubes ADD CONSTRAINT clubes_pagina_pede_endereco
      CHECK (NOT pagina_publica OR endereco IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS clubes_endereco_idx ON public.clubes (endereco) WHERE endereco IS NOT NULL;

-- Define o endereço e liga ou desliga a página. Devolve o endereço gravado.
CREATE OR REPLACE FUNCTION public.clube_definir_pagina_publica(p_clube_id uuid, p_endereco text, p_ativa boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_endereco text := nullif(lower(btrim(coalesce(p_endereco, ''))), '');
BEGIN
  IF v_uid IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.clubes c WHERE c.id = p_clube_id)
     OR NOT (public.is_clube_dono(v_uid, p_clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só quem criou o clube define a página pública.' USING ERRCODE = '42501';
  END IF;

  IF v_endereco IS NULL THEN
    IF coalesce(p_ativa, false) THEN
      RAISE EXCEPTION 'Escolha um endereço antes de ligar a página.' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF v_endereco !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR char_length(v_endereco) NOT BETWEEN 3 AND 40 THEN
      RAISE EXCEPTION 'O endereço usa só letras minúsculas, números e hífen, com 3 a 40 caracteres.' USING ERRCODE = '22023';
    END IF;
    IF public.clube_endereco_reservado(v_endereco) THEN
      RAISE EXCEPTION 'Esse endereço é reservado. Escolha outro.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.clubes c WHERE c.endereco = v_endereco AND c.id <> p_clube_id) THEN
      RAISE EXCEPTION 'Esse endereço já está em uso por outro clube.' USING ERRCODE = '23505';
    END IF;
  END IF;

  UPDATE public.clubes
  SET endereco = v_endereco, pagina_publica = coalesce(p_ativa, false)
  WHERE id = p_clube_id;

  RETURN v_endereco;
END;
$$;

COMMENT ON FUNCTION public.clube_definir_pagina_publica(uuid, text, boolean) IS
  'Organizador define o endereço do clube e liga ou desliga a página pública.';

REVOKE ALL ON FUNCTION public.clube_definir_pagina_publica(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_definir_pagina_publica(uuid, text, boolean) TO authenticated, service_role;

-- O que a página pública mostra. Funciona sem login. NULL quando não há página.
CREATE OR REPLACE FUNCTION public.clube_pagina_publica(p_endereco text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH clube AS (
    SELECT c.*
    FROM public.clubes c
    WHERE c.endereco = lower(btrim(p_endereco))
      AND c.pagina_publica
      AND c.is_ativo = true
  ),
  trilha AS (
    SELECT
      t.ordem,
      o.titulo_original AS titulo,
      o.capa_padrao_url AS capa_url,
      t.data_inicio_sugerida AS data_inicio,
      t.data_fim_sugerida AS data_fim,
      (SELECT string_agg(a.nome_completo, ', ' ORDER BY oa.ordem)
         FROM public.obra_autores oa JOIN public.autores a ON a.id = oa.autor_id
        WHERE oa.obra_id = o.id) AS autor,
      -- Mesma regra do convite: o livro do período de hoje; senão o próximo
      -- que ainda não terminou; senão o primeiro da trilha.
      row_number() OVER (
        ORDER BY
          COALESCE(current_date BETWEEN t.data_inicio_sugerida AND t.data_fim_sugerida, false) DESC,
          (t.data_fim_sugerida IS NULL OR t.data_fim_sugerida >= current_date) DESC,
          t.ordem ASC
      ) AS posicao
    FROM public.clube_trilhas t
    JOIN public.obras o ON o.id = t.obra_id
    WHERE t.clube_id = (SELECT id FROM clube)
  )
  SELECT jsonb_build_object(
    'id', c.id,
    'endereco', c.endereco,
    'nome', c.nome,
    'descricao', c.descricao,
    'objetivo', c.objetivo,
    'categoria', c.categoria,
    'imagem_capa_url', c.imagem_capa_url,
    'privado', c.visibilidade = 'privado',
    'criado_em', c.created_at,
    'organizador', jsonb_build_object(
      'nome', COALESCE(p.nome_exibicao, p.username),
      'avatar_url', p.avatar_url,
      'bio', p.bio
    ),
    'membros', (SELECT count(*) FROM public.clube_membros m WHERE m.clube_id = c.id AND m.status = 'ativo'),
    'livro_atual', (
      SELECT jsonb_build_object('titulo', t.titulo, 'autor', t.autor, 'capa_url', t.capa_url,
                                'data_inicio', t.data_inicio, 'data_fim', t.data_fim)
      FROM trilha t WHERE t.posicao = 1
    ),
    'livros', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'titulo', t.titulo, 'autor', t.autor, 'capa_url', t.capa_url,
        'lido', COALESCE(t.data_fim < current_date, false) AND t.posicao <> 1
      ) ORDER BY t.ordem)
      FROM (SELECT * FROM trilha ORDER BY ordem LIMIT 24) t
    ), '[]'::jsonb),
    'encontros', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('titulo', e.titulo, 'inicio_em', e.inicio_em, 'tipo', e.tipo) ORDER BY e.inicio_em)
      FROM (
        SELECT ev.titulo, ev.inicio_em, ev.tipo
        FROM public.eventos ev
        WHERE ev.clube_id = c.id AND ev.inicio_em >= now()
        ORDER BY ev.inicio_em
        LIMIT 3
      ) e
    ), '[]'::jsonb)
  )
  FROM clube c
  LEFT JOIN public.perfis p ON p.user_id = c.curador_id;
$$;

COMMENT ON FUNCTION public.clube_pagina_publica(text) IS
  'Página pública do clube pelo endereço. Sem login. Só clube ativo com a página ligada.';

REVOKE ALL ON FUNCTION public.clube_pagina_publica(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clube_pagina_publica(text) TO anon, authenticated, service_role;
