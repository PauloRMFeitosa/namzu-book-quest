-- Painel do Admin (revisão do Admin, novembro de 2026).
--
-- Uma função só de leitura que entrega, em uma chamada, os números que o
-- admin precisa para acompanhar o produto: totais, eventos de produto por dia
-- e por tipo e a situação de cada clube. O app usa em Admin > Painel,
-- Admin > Métricas e Admin > Clubes (src/hooks/admin/useAdminPainel.ts).
--
-- Regras:
--   - Só admin executa. Para qualquer outra pessoa a função recusa.
--   - Não grava nada e não altera nenhuma tabela.
--   - Os dias são contados no fuso de Brasília.

CREATE OR REPLACE FUNCTION public.admin_painel(p_dias integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias integer := least(greatest(coalesce(p_dias, 14), 1), 90);
  v_desde timestamptz := now() - make_interval(days => v_dias);
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem ver o painel.' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'dias', v_dias,
    'totais', jsonb_build_object(
      'usuarios', (SELECT count(*) FROM auth.users),
      'usuarios_novos', (SELECT count(*) FROM auth.users u WHERE u.created_at >= v_desde),
      'usuarios_ativos_7d', (SELECT count(DISTINCT x.uid) FROM (
          SELECT u.id AS uid FROM auth.users u WHERE u.last_sign_in_at >= now() - interval '7 days'
          UNION
          SELECT e.user_id FROM public.eventos_produto e WHERE e.criado_em >= now() - interval '7 days') x),
      'clubes_ativos', (SELECT count(*) FROM public.clubes WHERE is_ativo),
      'clubes_com_atividade_7d', (SELECT count(DISTINCT e.clube_id) FROM public.eventos_produto e
          WHERE e.clube_id IS NOT NULL AND e.criado_em >= now() - interval '7 days'),
      'membros_ativos', (SELECT count(*) FROM public.clube_membros WHERE status = 'ativo'),
      'pedidos_pendentes', (SELECT count(*) FROM public.clube_membros WHERE status = 'pendente'),
      'encontros_proximos', (SELECT count(*) FROM public.eventos WHERE inicio_em >= now()),
      'obras', (SELECT count(*) FROM public.obras),
      'erros_7d', (SELECT count(*) FROM public.erros_app
          WHERE criado_em >= now() - interval '7 days' AND ambiente = 'producao'),
      'denuncias_pendentes', (SELECT count(*) FROM public.denuncias_conteudo WHERE status = 'pendente')
    ),
    'eventos_por_dia', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'total', coalesce(c.total, 0)) ORDER BY d.dia), '[]'::jsonb)
      FROM (SELECT generate_series(v_hoje - (v_dias - 1), v_hoje, interval '1 day')::date AS dia) d
      LEFT JOIN (
        SELECT (criado_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia, count(*) AS total
        FROM public.eventos_produto GROUP BY 1
      ) c ON c.dia = d.dia
    ),
    'eventos_por_tipo', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'evento', t.evento, 'total', t.total, 'clubes', t.clubes, 'pessoas', t.pessoas) ORDER BY t.total DESC, t.evento), '[]'::jsonb)
      FROM (
        SELECT e.evento, count(*) AS total, count(DISTINCT e.clube_id) AS clubes, count(DISTINCT e.user_id) AS pessoas
        FROM public.eventos_produto e WHERE e.criado_em >= v_desde GROUP BY 1
      ) t
    ),
    'clubes', (
      SELECT coalesce(jsonb_agg(c.linha ORDER BY c.ordem DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT greatest(cl.created_at, ult.ultima) AS ordem, jsonb_build_object(
          'id', cl.id,
          'nome', cl.nome,
          'ativo', cl.is_ativo,
          'visibilidade', cl.visibilidade,
          'criado_em', cl.created_at,
          'organizador', coalesce(pf.nome_exibicao, pf.username),
          'membros', (SELECT count(*) FROM public.clube_membros m WHERE m.clube_id = cl.id AND m.status = 'ativo'),
          'pendentes', (SELECT count(*) FROM public.clube_membros m WHERE m.clube_id = cl.id AND m.status = 'pendente'),
          'livros_na_trilha', (SELECT count(*) FROM public.clube_trilhas t WHERE t.clube_id = cl.id),
          'proximo_encontro', (SELECT min(ev.inicio_em) FROM public.eventos ev WHERE ev.clube_id = cl.id AND ev.inicio_em >= now()),
          'ultima_atividade', ult.ultima,
          'acoes_no_periodo', (SELECT count(*) FROM public.eventos_produto e WHERE e.clube_id = cl.id AND e.criado_em >= v_desde)
        ) AS linha
        FROM public.clubes cl
        LEFT JOIN public.perfis pf ON pf.user_id = cl.curador_id
        LEFT JOIN LATERAL (SELECT max(e.criado_em) AS ultima FROM public.eventos_produto e WHERE e.clube_id = cl.id) ult ON true
      ) c
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_painel(integer) IS
  'Números do painel do Admin: totais, eventos de produto e situação dos clubes. Só admin executa.';

REVOKE ALL ON FUNCTION public.admin_painel(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_painel(integer) TO authenticated, service_role;
