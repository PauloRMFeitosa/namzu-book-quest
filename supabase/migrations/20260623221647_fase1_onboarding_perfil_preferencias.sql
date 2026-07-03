
-- ─────────────────────────────────────────────────────────────────
-- FASE 1 — Onboarding: perfil_preferencias + funções de match/seed
-- Atômica e idempotente — pode ser re-executada sem efeitos colaterais
-- ─────────────────────────────────────────────────────────────────

-- ── 1. TABELA perfil_preferencias ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perfil_preferencias (
  user_id        uuid         PRIMARY KEY
                              REFERENCES auth.users(id) ON DELETE CASCADE,
  generos        text[]       NOT NULL DEFAULT '{}',
  livros_amados  uuid[]       NOT NULL DEFAULT '{}',
  ritmo          text         CHECK (ritmo IN ('lento', 'moderado', 'intenso')),
  objetivo       text         CHECK (objetivo IN ('ler_mais', 'descobrir', 'comunidade')),
  criado_em      timestamptz  NOT NULL DEFAULT now(),
  atualizado_em  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perfil_preferencias IS
  'Preferências coletadas no quiz de onboarding. Uma linha por usuário, inserida após o signup.';

COMMENT ON COLUMN public.perfil_preferencias.generos IS
  'Slugs de gênero escolhidos no quiz (ex: [''ficcao'', ''filosofia''])';
COMMENT ON COLUMN public.perfil_preferencias.livros_amados IS
  'IDs de obras marcadas como amadas na tela 3 do onboarding';
COMMENT ON COLUMN public.perfil_preferencias.ritmo IS
  'Ritmo de leitura: lento | moderado | intenso';
COMMENT ON COLUMN public.perfil_preferencias.objetivo IS
  'Objetivo no Namzu: ler_mais | descobrir | comunidade';

-- ── 2. RLS ───────────────────────────────────────────────────────
ALTER TABLE public.perfil_preferencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfpref: leitura pelo dono"     ON public.perfil_preferencias;
DROP POLICY IF EXISTS "perfpref: insercao pelo dono"    ON public.perfil_preferencias;
DROP POLICY IF EXISTS "perfpref: atualizacao pelo dono" ON public.perfil_preferencias;

CREATE POLICY "perfpref: leitura pelo dono"
  ON public.perfil_preferencias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "perfpref: insercao pelo dono"
  ON public.perfil_preferencias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "perfpref: atualizacao pelo dono"
  ON public.perfil_preferencias FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Trigger: atualiza atualizado_em automaticamente ───────────
CREATE OR REPLACE FUNCTION public.perfil_preferencias_set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfil_preferencias_atualizado_em
  ON public.perfil_preferencias;

CREATE TRIGGER trg_perfil_preferencias_atualizado_em
  BEFORE UPDATE ON public.perfil_preferencias
  FOR EACH ROW EXECUTE FUNCTION public.perfil_preferencias_set_atualizado_em();

-- ── 4. FUNÇÃO match_clubes_por_gosto ─────────────────────────────
-- Retorna os 3 clubes públicos com maior afinidade pelos gêneros e
-- objetivo declarados no quiz. Não exige sessão válida (pode ser
-- chamada antes do signup para pré-visualizar o resultado).
CREATE OR REPLACE FUNCTION public.match_clubes_por_gosto(
  p_generos  text[],
  p_objetivo text
)
RETURNS TABLE (
  clube_id    uuid,
  nome        text,
  descricao   text,
  categoria   text,
  score       int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH mapeamento(categoria_clube, generos_associados) AS (
    SELECT * FROM (VALUES
      ('ficcao'::text,          ARRAY['ficcao', 'literatura']::text[]),
      ('filosofia',             ARRAY['filosofia']),
      ('historia',              ARRAY['historia']),
      ('desenvolvimento',       ARRAY['autoajuda', 'psicologia']),
      ('infantojuvenil',        ARRAY['infantojuvenil', 'jovem-adulto']),
      ('biografia',             ARRAY['biografia']),
      ('espiritualidade',       ARRAY['religiao', 'filosofia']),
      ('classicos',             ARRAY['literatura', 'ficcao', 'poesia']),
      ('fantasia',              ARRAY['ficcao', 'jovem-adulto']),
      ('negocios',              ARRAY['negocios'])
    ) AS t(categoria_clube, generos_associados)
  ),
  objetivo_bonus(objetivo_key, categorias_bonus) AS (
    SELECT * FROM (VALUES
      ('ler_mais'::text,    ARRAY['desenvolvimento', 'classicos', 'biografia']::text[]),
      ('descobrir',         ARRAY['ficcao', 'fantasia', 'classicos', 'historia']),
      ('comunidade',        ARRAY['ficcao', 'filosofia', 'fantasia', 'negocios'])
    ) AS t(objetivo_key, categorias_bonus)
  ),
  scores AS (
    SELECT
      c.id                                    AS clube_id,
      c.nome,
      c.descricao,
      c.categoria,
      -- pontos por sobreposição de gêneros (3 pts por gênero em comum)
      COALESCE((
        SELECT (
          SELECT COUNT(*)::int
          FROM unnest(m.generos_associados) AS ga
          WHERE ga = ANY(p_generos)
        ) * 3
        FROM mapeamento m
        WHERE m.categoria_clube = c.categoria
        LIMIT 1
      ), 0)
      -- bônus de objetivo (2 pts)
      + CASE
          WHEN EXISTS (
            SELECT 1 FROM objetivo_bonus ob
            WHERE ob.objetivo_key = p_objetivo
              AND c.categoria = ANY(ob.categorias_bonus)
          ) THEN 2
          ELSE 0
        END                                   AS score
    FROM clubes c
    WHERE c.is_ativo = true
      AND c.visibilidade = 'publico'
  )
  SELECT s.clube_id, s.nome, s.descricao, s.categoria, s.score::int
  FROM scores s
  ORDER BY s.score DESC, s.nome
  LIMIT 3;
END;
$$;

COMMENT ON FUNCTION public.match_clubes_por_gosto IS
  'RN-ONB-01: Retorna top 3 clubes públicos por afinidade de gênero/objetivo. '
  'Score = (gêneros em comum × 3) + (objetivo compatível × 2). '
  'Pode ser chamada anonimamente (pré-visualização) ou autenticada (join pós-signup).';

-- ── 5. FUNÇÃO seed_estante_inicial ───────────────────────────────
-- Popula a estante do novo usuário com até 12 obras recomendadas
-- com base nos gêneros de perfil_preferencias. Idempotente via
-- ON CONFLICT DO NOTHING. Valida auth.uid() == p_user_id.
CREATE OR REPLACE FUNCTION public.seed_estante_inicial(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_generos        text[];
  v_livros_amados  uuid[];
BEGIN
  -- Garante que somente o próprio usuário chama a função
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'seed_estante_inicial: acesso negado — chamador não é o dono da conta';
  END IF;

  -- Lê preferências (lança NO_DATA_FOUND se não existir)
  SELECT generos, livros_amados
  INTO STRICT v_generos, v_livros_amados
  FROM public.perfil_preferencias
  WHERE user_id = p_user_id;

  -- Insere até 12 obras dos gêneros preferidos
  -- Exclui: livros amados (já estão na estante), livros já presentes
  INSERT INTO public.usuario_livros
    (user_id, obra_id, edicao_id, status, created_at, updated_at)
  SELECT
    p_user_id,
    sub.obra_id,
    sub.edicao_id,
    'quero_ler',
    now(),
    now()
  FROM (
    SELECT DISTINCT ON (og.obra_id)
      og.obra_id,
      e.id AS edicao_id
    FROM obra_generos og
    JOIN generos g  ON g.id      = og.genero_id
    JOIN edicoes e  ON e.obra_id = og.obra_id
    WHERE g.slug = ANY(v_generos)
      -- Não duplicar livros amados (usuário já os adicionará separadamente)
      AND og.obra_id != ALL(COALESCE(v_livros_amados, '{}'))
      -- Não duplicar livros já na estante (idempotência)
      AND NOT EXISTS (
        SELECT 1 FROM usuario_livros ul
        WHERE ul.user_id = p_user_id
          AND ul.obra_id = og.obra_id
      )
    ORDER BY og.obra_id, e.id
    LIMIT 12
  ) sub
  ON CONFLICT (user_id, obra_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.seed_estante_inicial IS
  'RN-ONB-02: Popula estante inicial do usuário com até 12 obras dos gêneros '
  'declarados em perfil_preferencias. Idempotente. Deve ser chamada imediatamente '
  'após INSERT em perfil_preferencias durante o merge pós-signup.';

-- ── 6. Permissões de execução ─────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.match_clubes_por_gosto(text[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_estante_inicial(uuid)            TO authenticated;
