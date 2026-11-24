-- Fase 0 (docs/roadmap.md) — RPCs de leitura respeitam perfil privado.
--
-- Aplicada no remoto em 24/11/2026 (versão 20261124175313).
--
-- get_stats_leitura, get_generos_lidos, get_livros_por_mes,
-- calcular_streak_leitura e get_interacoes_diarias são SECURITY DEFINER e
-- recebem o id de qualquer usuário. Até aqui devolviam os dados sem consultar
-- `perfis.perfil_publico`, então um usuário logado conseguia ler as
-- estatísticas de um perfil privado chamando a RPC direto.
--
-- A regra passa a ser a mesma das políticas RLS de leitura, já centralizada em
-- `pode_ver_leituras_de`: o próprio dono, um admin ou qualquer pessoa quando o
-- perfil é público. Chamadas com a chave de serviço continuam liberadas.
-- Quem não pode ver recebe resultado vazio (ou zeros), sem erro, para o app
-- não quebrar.
--
-- O corpo das funções é o que estava em produção em 24/11/2026; só o filtro de
-- visibilidade foi acrescentado. A subconsulta escalar faz o Postgres avaliar
-- a regra uma única vez por chamada.
--
-- `get_contagem_social` fica como está: contagem de seguidores não é dado de
-- leitura e aparece no cabeçalho de qualquer perfil.
-- `get_atividade_leitura_anual` já aplicava a regra.

CREATE OR REPLACE FUNCTION public.get_stats_leitura(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_lidos bigint, total_citacoes bigint, streak_atual integer, paginas_estimadas bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH alvo AS (
    SELECT COALESCE(p_user_id, auth.uid()) AS uid
    WHERE pode_ver_leituras_de(COALESCE(p_user_id, auth.uid()))
       OR auth.role() = 'service_role'
  )
  SELECT
    (SELECT COUNT(*)
     FROM usuario_livros
     WHERE user_id = (SELECT uid FROM alvo)
       AND status  = 'lido')                               AS total_lidos,

    (SELECT COUNT(*)
     FROM leitura_citacoes lc
     JOIN leituras         l   ON l.id   = lc.leitura_id
     JOIN usuario_leituras ul  ON ul.id  = l.usuario_leitura_id
     JOIN usuario_livros   ulv ON ulv.id = ul.usuario_livro_id
     WHERE ulv.user_id = (SELECT uid FROM alvo))           AS total_citacoes,

    -- Streak simples: número de meses distintos com pelo menos 1 livro lido
    (SELECT COUNT(DISTINCT DATE_TRUNC('month', data_fim))::int
     FROM usuario_livros
     WHERE user_id  = (SELECT uid FROM alvo)
       AND status   = 'lido'
       AND data_fim >= CURRENT_DATE - INTERVAL '12 months'
       AND data_fim IS NOT NULL)                           AS streak_atual,

    (SELECT COUNT(*) * 300
     FROM usuario_livros
     WHERE user_id = (SELECT uid FROM alvo)
       AND status  = 'lido')                               AS paginas_estimadas;
$function$;

CREATE OR REPLACE FUNCTION public.get_generos_lidos(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(genero text, total bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    g.nome   AS genero,
    COUNT(*) AS total
  FROM usuario_livros ul
  JOIN obra_generos og ON og.obra_id = ul.obra_id
  JOIN generos      g  ON g.id       = og.genero_id
  WHERE ul.user_id = COALESCE(p_user_id, auth.uid())
    AND ul.status  = 'lido'
    AND (SELECT pode_ver_leituras_de(COALESCE(p_user_id, auth.uid()))
             OR auth.role() = 'service_role')
  GROUP BY g.nome
  ORDER BY total DESC
  LIMIT 8;
$function$;

CREATE OR REPLACE FUNCTION public.get_livros_por_mes(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(mes text, total bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    TO_CHAR(data_fim, 'YYYY-MM') AS mes,
    COUNT(*)                     AS total
  FROM usuario_livros
  WHERE user_id  = COALESCE(p_user_id, auth.uid())
    AND status   = 'lido'
    AND data_fim >= (CURRENT_DATE - INTERVAL '11 months')
    AND data_fim IS NOT NULL
    AND (SELECT pode_ver_leituras_de(COALESCE(p_user_id, auth.uid()))
             OR auth.role() = 'service_role')
  GROUP BY TO_CHAR(data_fim, 'YYYY-MM')
  ORDER BY mes;
$function$;

CREATE OR REPLACE FUNCTION public.get_interacoes_diarias(p_user_id uuid DEFAULT NULL::uuid, p_dias integer DEFAULT 30)
 RETURNS TABLE(dia date, percentual integer, categorias text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH interacoes AS (
    SELECT created_at::date AS dia, 'feed'::text AS categoria, 25 AS peso
    FROM clube_posts
    WHERE user_id = COALESCE(p_user_id, auth.uid())

    UNION ALL

    SELECT data_fim::date, 'livro_lido', 25
    FROM usuario_livros
    WHERE user_id = COALESCE(p_user_id, auth.uid())
      AND status IN ('lido', 'concluido')
      AND data_fim IS NOT NULL

    UNION ALL

    SELECT data_registro::date, 'progresso', 50
    FROM leitura_progresso
    WHERE user_id = COALESCE(p_user_id, auth.uid())
  ),
  por_categoria AS (
    SELECT DISTINCT dia, categoria, peso
    FROM interacoes
    WHERE dia IS NOT NULL
  )
  SELECT
    dia,
    SUM(peso)::int                                 AS percentual,
    STRING_AGG(categoria, ', ' ORDER BY categoria) AS categorias
  FROM por_categoria
  WHERE dia >= CURRENT_DATE - (p_dias - 1)
    AND (SELECT pode_ver_leituras_de(COALESCE(p_user_id, auth.uid()))
             OR auth.role() = 'service_role')
  GROUP BY dia
  ORDER BY dia DESC;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_streak_leitura(_user_id uuid)
 RETURNS TABLE(atual integer, maximo integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_atual int := 0;
  v_max   int := 0;
  v_run   int := 0;
  v_prev  date;
  r       record;
BEGIN
  -- Perfil privado de outra pessoa: devolve zeros em vez de erro.
  IF (pode_ver_leituras_de(_user_id) OR auth.role() = 'service_role') IS NOT TRUE THEN
    atual := 0;
    maximo := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  FOR r IN
    SELECT DISTINCT (data_registro AT TIME ZONE 'UTC')::date AS dia
    FROM public.leitura_progresso
    WHERE user_id = _user_id
    ORDER BY dia
  LOOP
    IF v_prev IS NULL OR r.dia = v_prev + 1 THEN
      v_run := v_run + 1;
    ELSIF r.dia <> v_prev THEN
      v_run := 1;
    END IF;
    IF v_run > v_max THEN v_max := v_run; END IF;
    v_prev := r.dia;
  END LOOP;

  IF v_prev IS NOT NULL AND v_prev >= CURRENT_DATE - 1 THEN
    v_atual := v_run;
  ELSE
    v_atual := 0;
  END IF;

  atual := v_atual;
  maximo := v_max;
  RETURN NEXT;
END;
$function$;
