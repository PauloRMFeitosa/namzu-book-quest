-- ═══════════════════════════════════════════════════════════
-- FASE 4 — Citações + Match intelectual
-- Aplicar no Supabase SQL Editor (dashboard.supabase.com)
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────
-- 4.1  RPC: citações do usuário logado
-- ──────────────────────────────────────────
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

-- ──────────────────────────────────────────
-- 4.2  Função: calcular_matches
-- Score = (interesses_comuns × 3) + (generos_comuns × 2) + (obras_comuns × 5)
-- Normalizado 0–100 (máx teórico ~150 → clamp)
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION calcular_matches(p_user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outros uuid[];
  v_outro  uuid;
BEGIN
  -- Candidatos: usuários com perfil público (excluindo o próprio)
  SELECT ARRAY(
    SELECT user_id FROM perfis
    WHERE perfil_publico = true
      AND user_id <> p_user_id
  ) INTO v_outros;

  FOREACH v_outro IN ARRAY v_outros LOOP
    DECLARE
      v_int_comuns   int;
      v_gen_comuns   int;
      v_obras_comuns int;
      v_score        numeric;
      v_motivos      jsonb;
      v_int_nomes    text[];
      v_gen_nomes    text[];
      v_obra_nomes   text[];
    BEGIN
      -- Interesses em comum
      SELECT COUNT(*), ARRAY_AGG(i.nome)
      INTO v_int_comuns, v_int_nomes
      FROM perfil_interesses pi1
      JOIN perfil_interesses pi2 ON pi2.interesse_id = pi1.interesse_id
        AND pi2.user_id = v_outro
      JOIN interesses i ON i.id = pi1.interesse_id
      WHERE pi1.user_id = p_user_id;

      -- Gêneros lidos em comum
      SELECT COUNT(DISTINCT oa.genero_id), ARRAY_AGG(DISTINCT g.nome)
      INTO v_gen_comuns, v_gen_nomes
      FROM usuario_livros ul1
      JOIN obra_generos oa ON oa.obra_id = ul1.obra_id
      JOIN generos g ON g.id = oa.genero_id
      WHERE ul1.user_id = p_user_id
        AND ul1.status = 'lido'
        AND EXISTS (
          SELECT 1 FROM usuario_livros ul2
          JOIN obra_generos oa2 ON oa2.obra_id = ul2.obra_id
          WHERE ul2.user_id = v_outro
            AND ul2.status = 'lido'
            AND oa2.genero_id = oa.genero_id
        );

      -- Obras em comum
      SELECT COUNT(*), ARRAY_AGG(o.titulo_original)
      INTO v_obras_comuns, v_obra_nomes
      FROM usuario_livros ul1
      JOIN obras o ON o.id = ul1.obra_id
      WHERE ul1.user_id = p_user_id
        AND ul1.status = 'lido'
        AND EXISTS (
          SELECT 1 FROM usuario_livros ul2
          WHERE ul2.user_id = v_outro
            AND ul2.obra_id = ul1.obra_id
            AND ul2.status = 'lido'
        );

      -- Score (clamp 0–100)
      v_score := LEAST(100, (v_int_comuns * 3 + v_gen_comuns * 2 + v_obras_comuns * 5));

      -- Só registrar acima do mínimo
      IF v_score >= 30 THEN
        -- Motivos: até 5 interesses + gêneros + "N livros em comum"
        v_motivos := '[]'::jsonb;
        IF v_int_comuns  > 0 THEN v_motivos := v_motivos || to_jsonb(v_int_nomes[1:3]); END IF;
        IF v_gen_comuns  > 0 THEN v_motivos := v_motivos || to_jsonb(v_gen_nomes[1:2]); END IF;
        IF v_obras_comuns > 0 THEN
          v_motivos := v_motivos || jsonb_build_array(
            v_obras_comuns || ' livro' || CASE WHEN v_obras_comuns > 1 THEN 's' ELSE '' END || ' em comum'
          );
        END IF;

        INSERT INTO matches_intelectuais (user_a, user_b, compatibilidade, motivos, status)
        VALUES (
          LEAST(p_user_id, v_outro),
          GREATEST(p_user_id, v_outro),
          v_score,
          v_motivos,
          'ativo'
        )
        ON CONFLICT (user_a, user_b) DO UPDATE
          SET compatibilidade = EXCLUDED.compatibilidade,
              motivos         = EXCLUDED.motivos;
      END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION calcular_matches(uuid) TO authenticated;

-- Garantir unique constraint em matches_intelectuais para o ON CONFLICT funcionar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matches_intelectuais_user_a_user_b_key'
  ) THEN
    ALTER TABLE matches_intelectuais ADD CONSTRAINT matches_intelectuais_user_a_user_b_key UNIQUE (user_a, user_b);
  END IF;
END $$;

-- RPC para o usuário recalcular os próprios matches
CREATE OR REPLACE FUNCTION recalcular_meus_matches()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT calcular_matches(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION recalcular_meus_matches() TO authenticated;

-- RPC para buscar matches do usuário logado com dados do perfil
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
  JOIN perfis p ON p.user_id = CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END
  WHERE (m.user_a = auth.uid() OR m.user_b = auth.uid())
    AND m.status = 'ativo'
  ORDER BY m.compatibilidade DESC
  LIMIT p_limite;
$$;

GRANT EXECUTE ON FUNCTION get_meus_matches(int) TO authenticated;

-- ──────────────────────────────────────────
-- 4.3  RPCs de estatísticas
-- ──────────────────────────────────────────

-- Livros lidos por mês (últimos 12 meses)
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
  WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND status   = 'lido'
    AND data_fim >= (CURRENT_DATE - INTERVAL '11 months')
    AND data_fim IS NOT NULL
  GROUP BY TO_CHAR(data_fim, 'YYYY-MM')
  ORDER BY mes;
$$;

GRANT EXECUTE ON FUNCTION get_livros_por_mes(uuid) TO authenticated;

-- Distribuição por gênero
CREATE OR REPLACE FUNCTION get_generos_lidos(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (genero text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.nome  AS genero,
    COUNT(*) AS total
  FROM usuario_livros ul
  JOIN obra_generos og ON og.obra_id = ul.obra_id
  JOIN generos       g ON g.id       = og.genero_id
  WHERE ul.user_id = COALESCE(p_user_id, auth.uid())
    AND ul.status  = 'lido'
  GROUP BY g.nome
  ORDER BY total DESC
  LIMIT 8;
$$;

GRANT EXECUTE ON FUNCTION get_generos_lidos(uuid) TO authenticated;

-- Stats numéricos resumidos
CREATE OR REPLACE FUNCTION get_stats_leitura(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_lidos      bigint,
  total_citacoes   bigint,
  streak_atual     int,
  paginas_estimadas bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH uid AS (SELECT COALESCE(p_user_id, auth.uid()) AS id),
  lidos AS (
    SELECT data_fim::date AS d
    FROM usuario_livros, uid
    WHERE user_id = uid.id AND status = 'lido' AND data_fim IS NOT NULL
  ),
  streak AS (
    -- Streak: dias consecutivos com pelo menos 1 livro terminado
    SELECT COUNT(DISTINCT d)::int AS dias
    FROM lidos
    WHERE d >= (
      SELECT MIN(d2) FROM (
        SELECT DISTINCT d AS d2 FROM lidos
        WHERE d >= CURRENT_DATE - INTERVAL '365 days'
      ) sub
    )
  )
  SELECT
    (SELECT COUNT(*) FROM usuario_livros, uid WHERE user_id = uid.id AND status = 'lido'),
    (SELECT COUNT(*)
     FROM leitura_citacoes lc
     JOIN leituras l ON l.id = lc.leitura_id
     JOIN usuario_leituras uleit ON uleit.id = l.usuario_leitura_id
     JOIN usuario_livros ulv ON ulv.id = uleit.usuario_livro_id, uid
     WHERE ulv.user_id = uid.id),
    (SELECT dias FROM streak),
    -- Estimativa: 300 páginas por livro (sem campo real ainda)
    (SELECT COUNT(*) * 300 FROM usuario_livros, uid WHERE user_id = uid.id AND status = 'lido');
$$;

GRANT EXECUTE ON FUNCTION get_stats_leitura(uuid) TO authenticated;
