-- Fase 3 (docs/roadmap.md) — livro e cronograma.
--
-- Aplicada no remoto em 25/11/2026 (versão 20261125143223).
--
-- O organizador divide o livro do ciclo em metas com data ("Semana 1",
-- "Capítulos 1 a 3"). O membro vê a meta atual na aba de leituras e recebe um
-- aviso no app quando o prazo está chegando e ele ainda não alcançou a meta.
--
-- O que muda:
--   1. `notificacoes_tipo_check` ganha o tipo novo `clube_meta_leitura` e dois
--      tipos que o banco já tentava gravar e a restrição recusava:
--      `clube_novo_conteudo` (gatilho de `clube_conteudos`) e
--      `meta_diaria_lembrete` (lembrete da meta diária).
--   2. Tabela `clube_metas_leitura`, com RLS.
--   3. Função `clube_salvar_cronograma`, que grava datas do livro e metas de
--      uma vez.
--   4. Função `processar_avisos_meta_clube` e agendamento diário às 9h de
--      Brasília.
--   5. `clube_visao_geral` passa a devolver a meta atual e o item da trilha.

-- ---------------------------------------------------------------------------
-- 1. Tipos de notificação
-- ---------------------------------------------------------------------------
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'novo_conteudo',
    'novo_comentario',
    'missao',
    'streak_risco',
    'conquista',
    'ranking',
    'avaliacao_pendente',
    'clube_novo_membro',
    'clube_curtida_post',
    'clube_novo_evento',
    'clube_novo_post',
    'clube_novo_comentario',
    'clube_novo_livro_trilha',
    'clube_novo_conteudo',   -- já usado por notify_novo_conteudo
    'meta_diaria_lembrete',  -- já usado por processar_lembretes_meta_diaria_inapp
    'clube_meta_leitura'     -- novo: aviso de meta do cronograma
  ]));

-- ---------------------------------------------------------------------------
-- 2. Metas do cronograma
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clube_metas_leitura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trilha_id uuid NOT NULL REFERENCES public.clube_trilhas(id) ON DELETE CASCADE,
  clube_id uuid NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 80),
  -- Até que ponto do livro a meta vai, em %. Opcional: sem ele a meta aparece,
  -- mas não dá para dizer quem já alcançou.
  percentual_alvo integer CHECK (percentual_alvo BETWEEN 1 AND 100),
  data_limite date NOT NULL,
  aviso_enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clube_metas_leitura IS
  'Metas do cronograma de leitura de um livro da trilha do clube.';

CREATE INDEX IF NOT EXISTS idx_clube_metas_leitura_trilha ON public.clube_metas_leitura (trilha_id, data_limite);
CREATE INDEX IF NOT EXISTS idx_clube_metas_leitura_clube ON public.clube_metas_leitura (clube_id);
CREATE INDEX IF NOT EXISTS idx_clube_metas_leitura_aviso ON public.clube_metas_leitura (data_limite)
  WHERE aviso_enviado_em IS NULL;

-- O clube da meta é sempre o clube do item da trilha. Se o prazo for adiado
-- depois do aviso, o aviso volta a valer para a data nova.
CREATE OR REPLACE FUNCTION public.fn_clube_metas_leitura_regras()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_clube uuid;
BEGIN
  SELECT t.clube_id INTO v_clube FROM public.clube_trilhas t WHERE t.id = NEW.trilha_id;
  IF v_clube IS NULL THEN
    RAISE EXCEPTION 'Livro da trilha não encontrado.' USING ERRCODE = '23503';
  END IF;
  NEW.clube_id := v_clube;
  NEW.titulo := btrim(NEW.titulo);

  IF TG_OP = 'UPDATE' AND NEW.data_limite > OLD.data_limite THEN
    NEW.aviso_enviado_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clube_metas_leitura_regras ON public.clube_metas_leitura;
CREATE TRIGGER trg_clube_metas_leitura_regras
  BEFORE INSERT OR UPDATE ON public.clube_metas_leitura
  FOR EACH ROW EXECUTE FUNCTION public.fn_clube_metas_leitura_regras();

ALTER TABLE public.clube_metas_leitura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver metas do clube" ON public.clube_metas_leitura;
CREATE POLICY "ver metas do clube" ON public.clube_metas_leitura
  FOR SELECT TO authenticated
  USING (
    public.is_clube_membro((select auth.uid()), clube_id)
    OR public.is_clube_curador((select auth.uid()), clube_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "organizador cria metas" ON public.clube_metas_leitura;
CREATE POLICY "organizador cria metas" ON public.clube_metas_leitura
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_clube_curador((select auth.uid()), clube_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "organizador altera metas" ON public.clube_metas_leitura;
CREATE POLICY "organizador altera metas" ON public.clube_metas_leitura
  FOR UPDATE TO authenticated
  USING (
    public.is_clube_curador((select auth.uid()), clube_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.is_clube_curador((select auth.uid()), clube_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "organizador remove metas" ON public.clube_metas_leitura;
CREATE POLICY "organizador remove metas" ON public.clube_metas_leitura
  FOR DELETE TO authenticated
  USING (
    public.is_clube_curador((select auth.uid()), clube_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

-- Quem usa o app só escreve título, alvo e prazo. O clube vem do gatilho e a
-- marca de aviso enviado é só do agendador.
REVOKE ALL ON TABLE public.clube_metas_leitura FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.clube_metas_leitura TO authenticated;
GRANT INSERT (trilha_id, titulo, percentual_alvo, data_limite) ON TABLE public.clube_metas_leitura TO authenticated;
GRANT UPDATE (titulo, percentual_alvo, data_limite) ON TABLE public.clube_metas_leitura TO authenticated;
GRANT ALL ON TABLE public.clube_metas_leitura TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Salvar o cronograma de um livro de uma vez
-- ---------------------------------------------------------------------------
-- `p_metas` é uma lista de {id?, titulo, percentual_alvo?, data_limite}. Meta
-- com id é alterada, sem id é criada, e a que ficou de fora é removida.
-- Roda com as permissões de quem chama: as políticas acima continuam valendo.
CREATE OR REPLACE FUNCTION public.clube_salvar_cronograma(
  p_trilha_id uuid,
  p_data_inicio date,
  p_data_fim date,
  p_metas jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clube uuid;
  v_total integer;
BEGIN
  SELECT t.clube_id INTO v_clube FROM public.clube_trilhas t WHERE t.id = p_trilha_id;

  IF v_uid IS NULL
     OR v_clube IS NULL
     OR NOT (public.is_clube_curador(v_uid, v_clube) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só o organizador do clube define o cronograma.' USING ERRCODE = '42501';
  END IF;

  IF p_data_inicio IS NOT NULL AND p_data_fim IS NOT NULL AND p_data_fim < p_data_inicio THEN
    RAISE EXCEPTION 'A data final do livro não pode ser antes da data inicial.' USING ERRCODE = '22023';
  END IF;

  IF p_metas IS NULL OR jsonb_typeof(p_metas) <> 'array' THEN
    RAISE EXCEPTION 'Lista de metas inválida.' USING ERRCODE = '22023';
  END IF;

  v_total := jsonb_array_length(p_metas);
  IF v_total > 60 THEN
    RAISE EXCEPTION 'O cronograma aceita até 60 metas por livro.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_metas) e
    WHERE COALESCE(btrim(e->>'titulo'), '') = '' OR COALESCE(e->>'data_limite', '') = ''
  ) THEN
    RAISE EXCEPTION 'Toda meta precisa de título e data.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.clube_trilhas
     SET data_inicio_sugerida = p_data_inicio,
         data_fim_sugerida = p_data_fim
   WHERE id = p_trilha_id;

  DELETE FROM public.clube_metas_leitura m
   WHERE m.trilha_id = p_trilha_id
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(p_metas) e
       WHERE NULLIF(e->>'id', '') IS NOT NULL AND (e->>'id')::uuid = m.id
     );

  UPDATE public.clube_metas_leitura m
     SET titulo = e->>'titulo',
         percentual_alvo = NULLIF(e->>'percentual_alvo', '')::integer,
         data_limite = (e->>'data_limite')::date
    FROM jsonb_array_elements(p_metas) e
   WHERE m.trilha_id = p_trilha_id
     AND NULLIF(e->>'id', '') IS NOT NULL
     AND (e->>'id')::uuid = m.id;

  INSERT INTO public.clube_metas_leitura (trilha_id, titulo, percentual_alvo, data_limite)
  SELECT p_trilha_id,
         e->>'titulo',
         NULLIF(e->>'percentual_alvo', '')::integer,
         (e->>'data_limite')::date
    FROM jsonb_array_elements(p_metas) e
   WHERE NULLIF(e->>'id', '') IS NULL;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.clube_salvar_cronograma(uuid, date, date, jsonb) IS
  'Grava as datas do livro e as metas do cronograma. Só organizador do clube e admins.';

REVOKE ALL ON FUNCTION public.clube_salvar_cronograma(uuid, date, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_salvar_cronograma(uuid, date, date, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Aviso automático de meta
-- ---------------------------------------------------------------------------
-- Uma vez por meta, quando faltam 2 dias ou menos para o prazo. Recebe o aviso
-- quem é membro ativo, ainda não concluiu o livro e está abaixo do alvo. Meta
-- sem alvo avisa todos os que não concluíram.
CREATE OR REPLACE FUNCTION public.processar_avisos_meta_clube()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  r record;
  v_prazo text;
  v_enviados integer;
  v_total integer := 0;
BEGIN
  FOR r IN
    SELECT m.id, m.clube_id, m.titulo, m.percentual_alvo, m.data_limite,
           t.obra_id, o.titulo_original AS livro, c.nome AS clube
    FROM public.clube_metas_leitura m
    JOIN public.clube_trilhas t ON t.id = m.trilha_id
    JOIN public.obras o ON o.id = t.obra_id
    JOIN public.clubes c ON c.id = m.clube_id
    WHERE m.aviso_enviado_em IS NULL
      AND m.data_limite BETWEEN v_hoje AND v_hoje + 2
      AND c.is_ativo
    ORDER BY m.data_limite, m.created_at
    FOR UPDATE OF m SKIP LOCKED
  LOOP
    v_prazo := CASE r.data_limite - v_hoje
      WHEN 0 THEN 'termina hoje'
      WHEN 1 THEN 'termina amanhã'
      ELSE 'termina em 2 dias'
    END;

    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, link_url)
    SELECT cm.user_id,
           'clube_meta_leitura',
           'Meta de leitura do clube',
           'A meta "' || r.titulo || '" de "' || COALESCE(r.livro, 'livro do clube') || '" '
             || v_prazo || ' no clube "' || COALESCE(r.clube, 'seu clube') || '". Registre seu progresso.',
           r.clube_id,
           '/clubes/' || r.clube_id || '?tab=leituras'
    FROM public.clube_membros cm
    LEFT JOIN LATERAL (
      SELECT bool_or(ul.status = 'concluido') AS concluiu,
             max(lp.percentual_lido) AS percentual
      FROM public.usuario_leituras ul
      JOIN public.usuario_livros ulv ON ulv.id = ul.usuario_livro_id
      LEFT JOIN public.leituras l ON l.usuario_leitura_id = ul.id
      LEFT JOIN public.leitura_progresso lp ON lp.leitura_id = l.id
      WHERE ul.clube_id = r.clube_id
        AND ulv.obra_id = r.obra_id
        AND ulv.user_id = cm.user_id
    ) p ON true
    WHERE cm.clube_id = r.clube_id
      AND cm.status = 'ativo'
      AND NOT COALESCE(p.concluiu, false)
      AND (r.percentual_alvo IS NULL OR COALESCE(p.percentual, 0) < r.percentual_alvo);

    GET DIAGNOSTICS v_enviados = ROW_COUNT;
    v_total := v_total + v_enviados;

    UPDATE public.clube_metas_leitura SET aviso_enviado_em = now() WHERE id = r.id;
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.processar_avisos_meta_clube() IS
  'Agendador: avisa no app os membros abaixo da meta do cronograma quando o prazo está a 2 dias ou menos.';

REVOKE ALL ON FUNCTION public.processar_avisos_meta_clube() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_avisos_meta_clube() TO service_role;

-- Todo dia às 12:00 UTC (9h de Brasília).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('avisos-meta-clube', '0 12 * * *', 'SELECT public.processar_avisos_meta_clube()');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Visão geral: meta atual e item da trilha
-- ---------------------------------------------------------------------------
-- Igual à versão de 20261125135458, com dois acréscimos: `livro_atual.trilha_id`
-- e `meta_atual` (a primeira meta do livro atual que ainda não venceu).
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
  v_meta record;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
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
  SELECT o.id, o.titulo_original, o.capa_padrao_url, t.data_inicio_sugerida, t.data_fim_sugerida,
         t.id AS trilha_id
    INTO v_obra
  FROM public.clube_trilhas t
  JOIN public.obras o ON o.id = t.obra_id
  WHERE t.clube_id = p_clube_id
  ORDER BY
    COALESCE(current_date BETWEEN t.data_inicio_sugerida AND t.data_fim_sugerida, false) DESC,
    (t.data_fim_sugerida IS NULL OR t.data_fim_sugerida >= current_date) DESC,
    t.ordem ASC
  LIMIT 1;

  SELECT m.id, m.titulo, m.percentual_alvo, m.data_limite
    INTO v_meta
  FROM public.clube_metas_leitura m
  WHERE m.trilha_id = v_obra.trilha_id AND m.data_limite >= v_hoje
  ORDER BY m.data_limite ASC, m.created_at ASC
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
      'trilha_id', v_obra.trilha_id,
      'titulo', v_obra.titulo_original,
      'capa_url', v_obra.capa_padrao_url,
      'data_inicio', v_obra.data_inicio_sugerida,
      'data_fim', v_obra.data_fim_sugerida
    ) END,
    'meta_atual', CASE WHEN v_meta.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_meta.id,
      'titulo', v_meta.titulo,
      'percentual_alvo', v_meta.percentual_alvo,
      'data_limite', v_meta.data_limite
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
