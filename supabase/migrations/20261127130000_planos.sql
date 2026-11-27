-- Planos do organizador (preparação da Fase 5, docs/roadmap.md).
--
-- Cadastro dos planos e de qual plano cada organizador tem, para o admin
-- montar e ajustar em Admin > Planos. Esta migração NÃO aplica limite nenhum:
-- nada no app passa a bloquear criação de clube, entrada de membro ou recurso.
-- A aplicação dos limites e a cobrança vêm em etapas seguintes.
--
-- Regras:
--   - Qualquer pessoa logada lê os planos (o organizador vai ver o próprio).
--   - Só admin cria, altera e arquiva plano, e só admin atribui plano.
--   - Cada pessoa lê a própria atribuição; admin lê todas.
--   - Existe no máximo um plano padrão: é o de quem não tem atribuição.
--   - Os recursos são chaves de texto; o catálogo fica em src/lib/planos.ts.
--
-- Não altera nenhuma tabela existente.

CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE CHECK (chave ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(chave) BETWEEN 2 AND 40),
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 60),
  descricao text CHECK (descricao IS NULL OR char_length(descricao) <= 300),
  preco_mensal_centavos integer NOT NULL DEFAULT 0 CHECK (preco_mensal_centavos >= 0),
  preco_anual_centavos integer CHECK (preco_anual_centavos IS NULL OR preco_anual_centavos >= 0),
  dias_de_teste integer NOT NULL DEFAULT 0 CHECK (dias_de_teste BETWEEN 0 AND 90),
  -- Limites: NULL significa sem limite.
  limite_membros integer CHECK (limite_membros IS NULL OR limite_membros > 0),
  limite_clubes integer CHECK (limite_clubes IS NULL OR limite_clubes > 0),
  limite_co_curadores integer CHECK (limite_co_curadores IS NULL OR limite_co_curadores >= 0),
  limite_ia_mes integer CHECK (limite_ia_mes IS NULL OR limite_ia_mes >= 0),
  recursos text[] NOT NULL DEFAULT '{}',
  publicado boolean NOT NULL DEFAULT false,
  destaque boolean NOT NULL DEFAULT false,
  padrao boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  arquivado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (padrao AND arquivado_em IS NOT NULL))
);

COMMENT ON TABLE public.planos IS
  'Planos do organizador: preço, limites e recursos. Gerido em Admin > Planos (src/lib/planos.ts).';
COMMENT ON COLUMN public.planos.limite_membros IS 'Máximo de membros ativos por clube. NULL = sem limite.';
COMMENT ON COLUMN public.planos.publicado IS 'Aparece na página de preços. Rascunho e plano interno ficam com false.';
COMMENT ON COLUMN public.planos.padrao IS 'Plano de quem não tem atribuição em organizador_planos. No máximo um.';

CREATE UNIQUE INDEX IF NOT EXISTS planos_um_padrao_idx ON public.planos ((true)) WHERE padrao;

CREATE TABLE IF NOT EXISTS public.organizador_planos (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE RESTRICT,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'cortesia', 'piloto', 'pagamento')),
  valido_ate date,
  observacao text CHECK (observacao IS NULL OR char_length(observacao) <= 300),
  atribuido_por uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizador_planos IS
  'Plano de cada organizador. Quem não está aqui usa o plano padrão.';

CREATE INDEX IF NOT EXISTS organizador_planos_plano_idx ON public.organizador_planos (plano_id);

-- Mantém atualizado_em e garante um único plano padrão: marcar um desmarca o outro.
CREATE OR REPLACE FUNCTION public.planos_antes_de_gravar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em := now();
  -- A comparação por chave evita que uma inserção repetida, que vai falhar ou
  -- ser ignorada por conflito de chave, tire a marca do plano que já existe.
  IF NEW.padrao AND (TG_OP = 'INSERT' OR NOT OLD.padrao) THEN
    UPDATE public.planos SET padrao = false WHERE padrao AND id <> NEW.id AND chave <> NEW.chave;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planos_antes_de_gravar ON public.planos;
CREATE TRIGGER planos_antes_de_gravar
  BEFORE INSERT OR UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.planos_antes_de_gravar();

CREATE OR REPLACE FUNCTION public.organizador_planos_antes_de_gravar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em := now();
  NEW.atribuido_por := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizador_planos_antes_de_gravar ON public.organizador_planos;
CREATE TRIGGER organizador_planos_antes_de_gravar
  BEFORE INSERT OR UPDATE ON public.organizador_planos
  FOR EACH ROW EXECUTE FUNCTION public.organizador_planos_antes_de_gravar();

REVOKE ALL ON FUNCTION public.planos_antes_de_gravar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.organizador_planos_antes_de_gravar() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizador_planos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.planos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.organizador_planos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.planos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizador_planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
GRANT ALL ON public.organizador_planos TO service_role;

DROP POLICY IF EXISTS "logado le planos" ON public.planos;
CREATE POLICY "logado le planos" ON public.planos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin cria plano" ON public.planos;
CREATE POLICY "admin cria plano" ON public.planos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin altera plano" ON public.planos;
CREATE POLICY "admin altera plano" ON public.planos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "le o proprio plano" ON public.organizador_planos;
CREATE POLICY "le o proprio plano" ON public.organizador_planos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin atribui plano" ON public.organizador_planos;
CREATE POLICY "admin atribui plano" ON public.organizador_planos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin troca plano" ON public.organizador_planos;
CREATE POLICY "admin troca plano" ON public.organizador_planos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin tira plano" ON public.organizador_planos;
CREATE POLICY "admin tira plano" ON public.organizador_planos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Organizadores com o uso de cada um, para o admin comparar com o plano.
CREATE OR REPLACE FUNCTION public.admin_planos_organizadores()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Só admin vê os planos dos organizadores.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(o.linha ORDER BY o.nome), '[]'::jsonb)
    FROM (
      SELECT
        coalesce(pf.nome_exibicao, pf.username, 'Sem nome') AS nome,
        jsonb_build_object(
          'user_id', u.user_id,
          'nome', coalesce(pf.nome_exibicao, pf.username, 'Sem nome'),
          'clubes', u.clubes,
          'maior_clube', u.maior_clube,
          'co_curadores', u.co_curadores,
          'plano_id', op.plano_id,
          'origem', op.origem,
          'valido_ate', op.valido_ate,
          'observacao', op.observacao
        ) AS linha
      FROM (
        SELECT
          cl.curador_id AS user_id,
          count(*) AS clubes,
          coalesce(max((SELECT count(*) FROM public.clube_membros m
                        WHERE m.clube_id = cl.id AND m.status = 'ativo')), 0) AS maior_clube,
          coalesce(max((SELECT count(*) FROM public.clube_membros m
                        WHERE m.clube_id = cl.id AND m.status = 'ativo' AND m.papel = 'co_curador')), 0) AS co_curadores
        FROM public.clubes cl
        WHERE cl.curador_id IS NOT NULL
        GROUP BY cl.curador_id
      ) u
      LEFT JOIN public.perfis pf ON pf.user_id = u.user_id
      LEFT JOIN public.organizador_planos op ON op.user_id = u.user_id
    ) o
  );
END;
$$;

COMMENT ON FUNCTION public.admin_planos_organizadores() IS
  'Admin > Planos: cada organizador com número de clubes, maior clube, co-curadores e plano atribuído.';

REVOKE ALL ON FUNCTION public.admin_planos_organizadores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_planos_organizadores() TO authenticated, service_role;

-- Três planos de partida, como rascunho (não publicados). O Básico é o padrão.
-- Preços e limites são hipóteses, para ajustar em Admin > Planos. Só entram
-- quando a tabela está vazia, para não mexer no que o admin já montou.
INSERT INTO public.planos
  (chave, nome, descricao, preco_mensal_centavos, preco_anual_centavos, dias_de_teste,
   limite_membros, limite_clubes, limite_co_curadores, limite_ia_mes, recursos, destaque, padrao, ordem)
SELECT * FROM (VALUES
  ('basico', 'Básico', 'Para clubes de amigos e de família.', 0, NULL::integer, 0,
   30, 1, 1, 0,
   ARRAY['trilha','encontros','votacao_data','avisos','convite_link','feed','canais','painel_pendencias','pagina_publica'],
   false, true, 1),
  ('organizador', 'Organizador', 'Para quem conduz um clube ativo.', 1990, 19900, 14,
   150, 3, 3, 100,
   ARRAY['trilha','encontros','votacao_data','avisos','convite_link','feed','canais','microgrupos','conteudos',
         'painel_pendencias','painel_historico','ia_copiloto','ia_provocacao','ia_resumo','ia_recomendacoes',
         'pagina_publica','pagina_personalizada'],
   true, false, 2),
  ('profissional', 'Profissional', 'Para criadores de conteúdo e clubes pagos.', 4990, 49900, 14,
   NULL, NULL, NULL, 500,
   ARRAY['trilha','encontros','votacao_data','avisos','convite_link','feed','canais','microgrupos','conteudos','ranking',
         'painel_pendencias','painel_historico','exportacao','ia_copiloto','ia_provocacao','ia_resumo','ia_recomendacoes',
         'pagina_publica','pagina_personalizada','sem_marca_namzu','dominio_proprio','mensalidade'],
   false, false, 3)
) AS semente
WHERE NOT EXISTS (SELECT 1 FROM public.planos);
