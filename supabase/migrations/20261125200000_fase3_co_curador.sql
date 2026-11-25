-- Fase 3 (docs/roadmap.md) — co-curador.
--
-- O organizador nomeia até 3 membros ativos como co-curadores. O co-curador
-- faz o dia a dia do clube: visão geral, membros, livro e cronograma,
-- encontros, presença, ata, votação de data, avisos, canais e conteúdos.
-- Continuam só com o organizador (e admins): apagar o clube, mudar nome e
-- visibilidade, nomear ou tirar co-curadores e mexer na participação do
-- próprio organizador.
--
-- Como funciona:
--   1. `is_clube_dono` passa a responder "é o organizador do clube".
--   2. `is_clube_curador`, usada por todas as políticas do dia a dia, passa a
--      valer também para o membro ativo com papel `co_curador`. As políticas
--      da tabela `clubes` comparam direto com `curador_id` e não mudam.
--   3. O gatilho de `clube_membros` ganha as regras do co-curador, e um
--      gatilho novo protege a exclusão.
--   4. `clube_visao_geral` aceita o co-curador.

-- ---------------------------------------------------------------------------
-- 1. Quem é o organizador e quem organiza
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_clube_dono(_user uuid, _clube uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (select 1 from public.clubes where id = _clube and curador_id = _user)
$$;

REVOKE ALL ON FUNCTION public.is_clube_dono(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clube_dono(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_clube_curador(_user uuid, _clube uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (select 1 from public.clubes where id = _clube and curador_id = _user)
      or exists (
        select 1 from public.clube_membros
        where clube_id = _clube and user_id = _user and status = 'ativo' and papel = 'co_curador'
      )
$$;

COMMENT ON FUNCTION public.is_clube_curador(uuid, uuid) IS
  'Quem organiza o clube no dia a dia: o organizador ou um co-curador ativo. Para "só o organizador", use is_clube_dono.';

-- ---------------------------------------------------------------------------
-- 2. Regras de clube_membros
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_clube_membros_regras()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dono_ou_admin boolean;
  v_vira_co_curador boolean;
BEGIN
  -- Só a escrita direta pela API, como usuário logado, passa pelas regras.
  IF current_user <> 'authenticated' OR v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.clube_id <> OLD.clube_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'Não é possível mover uma participação para outro clube ou usuário.'
      USING ERRCODE = '42501';
  END IF;

  v_dono_ou_admin := public.is_clube_dono(v_uid, NEW.clube_id)
                     OR public.has_role(v_uid, 'admin'::public.app_role);
  v_vira_co_curador := NEW.papel = 'co_curador'
                       AND (TG_OP = 'INSERT' OR OLD.papel IS DISTINCT FROM 'co_curador');

  -- Nomear co-curador: só o organizador (ou admin), só membro ativo, até 3.
  IF v_vira_co_curador THEN
    IF NOT v_dono_ou_admin THEN
      RAISE EXCEPTION 'Só o organizador do clube nomeia co-curadores.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status <> 'ativo' THEN
      RAISE EXCEPTION 'Só um membro ativo pode ser co-curador.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(*) FROM public.clube_membros m
        WHERE m.clube_id = NEW.clube_id AND m.papel = 'co_curador' AND m.user_id <> NEW.user_id) >= 3 THEN
      RAISE EXCEPTION 'O clube já tem 3 co-curadores.' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Organizador do clube e admin gerenciam membros livremente.
  IF v_dono_ou_admin THEN
    RETURN NEW;
  END IF;

  -- Co-curador gerencia os membros comuns e os moderadores. Não mexe na
  -- participação do organizador nem na de outro co-curador.
  IF public.is_clube_curador(v_uid, NEW.clube_id) AND NEW.user_id <> v_uid THEN
    IF public.is_clube_dono(NEW.user_id, NEW.clube_id)
       OR (TG_OP = 'UPDATE' AND OLD.papel = 'co_curador') THEN
      RAISE EXCEPTION 'Só o organizador do clube altera a participação dele ou de um co-curador.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Quem entra por conta própria é sempre membro comum. Em clube privado
    -- fica pendente até o organizador aprovar.
    NEW.papel := 'membro';
    NEW.status := CASE WHEN public.clube_e_privado(NEW.clube_id) THEN 'pendente' ELSE 'ativo' END;
    RETURN NEW;
  END IF;

  -- Daqui em diante é UPDATE feito por quem não é organizador nem admin, ou
  -- pelo co-curador na própria linha. O papel e a data de entrada nunca mudam
  -- por esse caminho, com uma exceção: o co-curador pode deixar de ser.
  IF NOT (OLD.user_id = v_uid AND OLD.papel = 'co_curador' AND NEW.papel = 'membro') THEN
    NEW.papel := OLD.papel;
  END IF;
  NEW.data_entrada := OLD.data_entrada;

  -- Linha de outra pessoa: só o moderador chega aqui (pela política), e só
  -- para aprovar um pedido de entrada.
  IF OLD.user_id <> v_uid THEN
    IF public.is_clube_moderador(v_uid, NEW.clube_id)
       AND OLD.status = 'pendente' AND NEW.status = 'ativo' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Moderador só pode aprovar ou recusar pedidos de entrada.'
      USING ERRCODE = '42501';
  END IF;

  -- Própria linha.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'banido' THEN
      RAISE EXCEPTION 'Você foi removido deste clube pelo organizador.'
        USING ERRCODE = '42501';
    ELSIF NEW.status = 'removido' THEN
      NULL; -- sair do clube
    ELSIF OLD.status = 'removido' THEN
      -- voltar ao clube segue a mesma regra de quem entra
      NEW.status := CASE WHEN public.clube_e_privado(NEW.clube_id) THEN 'pendente' ELSE 'ativo' END;
    ELSE
      RAISE EXCEPTION 'Só o organizador do clube pode aprovar a entrada.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_clube_membros_regras() FROM PUBLIC, anon, authenticated;

-- Exclusão: o co-curador remove membros comuns, mas não o organizador nem
-- outro co-curador. Cada um continua podendo sair por conta própria.
CREATE OR REPLACE FUNCTION public.trg_clube_membros_protege_exclusao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF current_user <> 'authenticated' OR v_uid IS NULL OR OLD.user_id = v_uid THEN
    RETURN OLD;
  END IF;
  IF public.is_clube_dono(v_uid, OLD.clube_id) OR public.has_role(v_uid, 'admin'::public.app_role) THEN
    RETURN OLD;
  END IF;
  IF public.is_clube_dono(OLD.user_id, OLD.clube_id) OR OLD.papel = 'co_curador' THEN
    RAISE EXCEPTION 'Só o organizador do clube remove a participação dele ou de um co-curador.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_clube_membros_protege_exclusao() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_clube_membros_protege_exclusao ON public.clube_membros;
CREATE TRIGGER trg_clube_membros_protege_exclusao
  BEFORE DELETE ON public.clube_membros
  FOR EACH ROW EXECUTE FUNCTION public.trg_clube_membros_protege_exclusao();

-- ---------------------------------------------------------------------------
-- 3. Visão geral aberta ao co-curador
-- ---------------------------------------------------------------------------
-- Igual à versão de 20261125143223; muda só quem pode chamar.
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
     OR NOT (public.is_clube_curador(v_uid, p_clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só quem organiza o clube vê a visão geral.' USING ERRCODE = '42501';
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
