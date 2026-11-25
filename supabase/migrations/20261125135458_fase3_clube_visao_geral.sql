-- Fase 3 (docs/roadmap.md) — visão geral do organizador.
--
-- Aplicada no remoto em 25/11/2026 (versão 20261125135458).
--
-- Uma chamada devolve o que o organizador precisa ver ao abrir o clube:
-- o livro atual, o próximo encontro com as respostas, os pedidos pendentes e,
-- para cada membro ativo, o progresso no livro atual, a última atividade no
-- clube e se está parado há 7 dias.
--
-- Só o organizador do clube e admins podem chamar. A função é SECURITY DEFINER
-- porque junta tabelas que o organizador não lê diretamente (por exemplo, o
-- progresso de leitura de cada membro), e por isso confere quem chama logo no
-- início. Só expõe dados do próprio clube.
--
-- Não altera tabela, política nem dado.

CREATE OR REPLACE FUNCTION public.clube_visao_geral(p_clube_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_curador uuid;
  v_obra record;
  v_evento record;
  v_resultado jsonb;
BEGIN
  SELECT c.curador_id INTO v_curador FROM public.clubes c WHERE c.id = p_clube_id;

  IF v_uid IS NULL
     OR v_curador IS NULL
     OR NOT (v_uid = v_curador OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só o organizador do clube vê a visão geral.' USING ERRCODE = '42501';
  END IF;

  -- Livro atual: o que está no período hoje; senão o próximo que ainda não
  -- terminou; senão o primeiro da trilha. Mesma regra da página de convite.
  SELECT o.id, o.titulo_original, o.capa_padrao_url, t.data_inicio_sugerida, t.data_fim_sugerida
    INTO v_obra
  FROM public.clube_trilhas t
  JOIN public.obras o ON o.id = t.obra_id
  WHERE t.clube_id = p_clube_id
  ORDER BY
    COALESCE(current_date BETWEEN t.data_inicio_sugerida AND t.data_fim_sugerida, false) DESC,
    (t.data_fim_sugerida IS NULL OR t.data_fim_sugerida >= current_date) DESC,
    t.ordem ASC
  LIMIT 1;

  SELECT e.id, e.titulo, e.inicio_em, e.url_evento
    INTO v_evento
  FROM public.eventos e
  WHERE e.clube_id = p_clube_id AND e.inicio_em >= now()
  ORDER BY e.inicio_em ASC
  LIMIT 1;

  WITH membros AS (
    SELECT m.user_id, m.papel, m.data_entrada,
           COALESCE(p.nome_exibicao, p.username)::text AS nome,
           p.avatar_url
    FROM public.clube_membros m
    LEFT JOIN public.perfis p ON p.user_id = m.user_id
    WHERE m.clube_id = p_clube_id AND m.status = 'ativo'
  ),
  leitura AS (
    -- progresso de cada pessoa no livro atual, dentro deste clube
    SELECT ulv.user_id,
           bool_or(ul.status = 'concluido') AS concluiu,
           max(lp.percentual_lido) AS percentual
    FROM public.usuario_leituras ul
    JOIN public.usuario_livros ulv ON ulv.id = ul.usuario_livro_id
    LEFT JOIN public.leituras l ON l.usuario_leitura_id = ul.id
    LEFT JOIN public.leitura_progresso lp ON lp.leitura_id = l.id
    WHERE ul.clube_id = p_clube_id AND ulv.obra_id = v_obra.id
    GROUP BY ulv.user_id
  ),
  atividade AS (
    -- última ação da pessoa no clube: progresso, post, mensagem ou RSVP
    SELECT x.user_id, max(x.quando) AS ultima
    FROM (
      SELECT lp.user_id, lp.data_registro::timestamptz AS quando
      FROM public.leitura_progresso lp
      JOIN public.leituras l ON l.id = lp.leitura_id
      JOIN public.usuario_leituras ul ON ul.id = l.usuario_leitura_id
      WHERE ul.clube_id = p_clube_id
      UNION ALL
      SELECT cp.user_id, cp.created_at FROM public.clube_posts cp WHERE cp.clube_id = p_clube_id
      UNION ALL
      SELECT ep.user_id, ep.joined_at
      FROM public.evento_participantes ep
      JOIN public.eventos e ON e.id = ep.evento_id
      WHERE e.clube_id = p_clube_id
      UNION ALL
      SELECT cm.user_id, cm.created_at
      FROM public.clube_mensagens cm
      JOIN public.clube_threads ct ON ct.id = cm.thread_id
      JOIN public.clube_canais cc ON cc.id = ct.canal_id
      WHERE cc.clube_id = p_clube_id AND cm.deleted_at IS NULL
    ) x
    WHERE x.quando IS NOT NULL
    GROUP BY x.user_id
  ),
  rsvp AS (
    SELECT ep.user_id, ep.status
    FROM public.evento_participantes ep
    WHERE ep.evento_id = v_evento.id
  ),
  linhas AS (
    SELECT
      m.user_id, m.nome, m.avatar_url, m.papel,
      (m.user_id = v_curador) AS organizador,
      CASE
        WHEN v_obra.id IS NULL THEN NULL
        WHEN COALESCE(l.concluiu, false) THEN 100
        ELSE LEAST(100, GREATEST(0, round(COALESCE(l.percentual, 0))))::integer
      END AS percentual,
      CASE
        WHEN v_obra.id IS NULL THEN NULL
        WHEN COALESCE(l.concluiu, false) THEN 'concluido'
        WHEN COALESCE(l.percentual, 0) > 0 THEN 'lendo'
        ELSE 'nao_iniciou'
      END AS status_leitura,
      a.ultima AS ultima_atividade,
      (
        m.user_id <> v_curador
        AND COALESCE(m.data_entrada, '-infinity'::timestamptz) < now() - interval '7 days'
        AND (a.ultima IS NULL OR a.ultima < now() - interval '7 days')
      ) AS parado,
      r.status AS rsvp
    FROM membros m
    LEFT JOIN leitura l ON l.user_id = m.user_id
    LEFT JOIN atividade a ON a.user_id = m.user_id
    LEFT JOIN rsvp r ON r.user_id = m.user_id
  )
  SELECT jsonb_build_object(
    'livro_atual', CASE WHEN v_obra.id IS NULL THEN NULL ELSE jsonb_build_object(
      'obra_id', v_obra.id,
      'titulo', v_obra.titulo_original,
      'capa_url', v_obra.capa_padrao_url,
      'data_inicio', v_obra.data_inicio_sugerida,
      'data_fim', v_obra.data_fim_sugerida
    ) END,
    'proximo_encontro', CASE WHEN v_evento.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_evento.id,
      'titulo', v_evento.titulo,
      'inicio_em', v_evento.inicio_em,
      'url_evento', v_evento.url_evento,
      'confirmados', (SELECT count(*) FROM linhas WHERE rsvp = 'confirmado'),
      'talvez', (SELECT count(*) FROM linhas WHERE rsvp = 'talvez'),
      'recusados', (SELECT count(*) FROM linhas WHERE rsvp = 'recusado'),
      'sem_resposta', (SELECT count(*) FROM linhas WHERE rsvp IS NULL)
    ) END,
    'pedidos_pendentes', (
      SELECT count(*) FROM public.clube_membros m
      WHERE m.clube_id = p_clube_id AND m.status = 'pendente'
    ),
    'membros_ativos', (SELECT count(*) FROM linhas),
    'parados', (SELECT count(*) FROM linhas WHERE parado),
    'membros', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'nome', nome,
        'avatar_url', avatar_url,
        'papel', papel,
        'organizador', organizador,
        'percentual', percentual,
        'status_leitura', status_leitura,
        'ultima_atividade', ultima_atividade,
        'parado', parado,
        'rsvp', rsvp
      ) ORDER BY parado DESC, COALESCE(percentual, 0) ASC, nome ASC NULLS LAST)
      FROM linhas
    ), '[]'::jsonb)
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION public.clube_visao_geral(uuid) IS
  'Visão geral do clube para o organizador: livro atual, próximo encontro, pedidos pendentes e progresso, atividade e RSVP de cada membro ativo.';

REVOKE ALL ON FUNCTION public.clube_visao_geral(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_visao_geral(uuid) TO authenticated, service_role;
