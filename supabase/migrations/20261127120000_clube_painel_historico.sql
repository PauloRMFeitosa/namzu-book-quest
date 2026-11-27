-- Painel do organizador (Fase 3): histórico do clube.
--
-- Uma função só de leitura com o que muda ao longo do tempo no clube: quantas
-- pessoas leram e participaram em cada uma das últimas 8 semanas, quantos
-- membros o clube tinha e como foram os últimos encontros (confirmados,
-- presentes e se há ata). O app usa em /clubes/:id/painel
-- (src/hooks/clubes/useHistoricoClube.ts).
--
-- Regras:
--   - Só quem organiza o clube (organizador ou co-curador) e admins executam.
--   - Não grava nada e não altera nenhuma tabela.
--   - As semanas começam na segunda-feira, no fuso de Brasília.

CREATE OR REPLACE FUNCTION public.clube_painel_historico(p_clube_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_semana date := date_trunc('week', v_hoje)::date;
BEGIN
  IF v_uid IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.clubes c WHERE c.id = p_clube_id)
     OR NOT (public.is_clube_curador(v_uid, p_clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só quem organiza o clube vê o histórico.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH semanas AS (
      SELECT (v_semana - (n * 7)) AS inicio FROM generate_series(0, 7) n
    ),
    atividade AS (
      SELECT lp.user_id, (lp.data_registro::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date AS dia, 'leitura' AS tipo
      FROM public.leitura_progresso lp
      JOIN public.leituras l ON l.id = lp.leitura_id
      JOIN public.usuario_leituras ul ON ul.id = l.usuario_leitura_id
      WHERE ul.clube_id = p_clube_id
      UNION ALL
      SELECT cp.user_id, (cp.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'conversa'
      FROM public.clube_posts cp WHERE cp.clube_id = p_clube_id
      UNION ALL
      SELECT cm.user_id, (cm.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'conversa'
      FROM public.clube_mensagens cm
      JOIN public.clube_threads ct ON ct.id = cm.thread_id
      JOIN public.clube_canais cc ON cc.id = ct.canal_id
      WHERE cc.clube_id = p_clube_id AND cm.deleted_at IS NULL
    )
    SELECT jsonb_build_object(
      'semanas', (
        SELECT jsonb_agg(jsonb_build_object(
          'inicio', s.inicio,
          'leitores', (SELECT count(DISTINCT a.user_id) FROM atividade a
                       WHERE a.tipo = 'leitura' AND a.dia >= s.inicio AND a.dia < s.inicio + 7),
          'participantes', (SELECT count(DISTINCT a.user_id) FROM atividade a
                            WHERE a.dia >= s.inicio AND a.dia < s.inicio + 7),
          'membros', (SELECT count(*) FROM public.clube_membros m
                      WHERE m.clube_id = p_clube_id AND m.status = 'ativo'
                        AND (m.data_entrada AT TIME ZONE 'America/Sao_Paulo')::date < s.inicio + 7)
        ) ORDER BY s.inicio)
        FROM semanas s
      ),
      'encontros', (
        SELECT coalesce(jsonb_agg(e.linha ORDER BY e.inicio_em), '[]'::jsonb)
        FROM (
          SELECT ev.inicio_em, jsonb_build_object(
            'id', ev.id,
            'titulo', ev.titulo,
            'inicio_em', ev.inicio_em,
            'confirmados', (SELECT count(*) FROM public.evento_participantes ep
                            WHERE ep.evento_id = ev.id AND ep.status = 'confirmado'),
            'presentes', (SELECT count(*) FROM public.evento_presencas pr WHERE pr.evento_id = ev.id),
            'tem_ata', EXISTS (SELECT 1 FROM public.evento_atas a WHERE a.evento_id = ev.id)
          ) AS linha
          FROM public.eventos ev
          WHERE ev.clube_id = p_clube_id AND ev.inicio_em < now()
          ORDER BY ev.inicio_em DESC
          LIMIT 8
        ) e
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.clube_painel_historico(uuid) IS
  'Histórico do clube para o painel do organizador: leitura e participação por semana e últimos encontros.';

REVOKE ALL ON FUNCTION public.clube_painel_historico(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_painel_historico(uuid) TO authenticated, service_role;
