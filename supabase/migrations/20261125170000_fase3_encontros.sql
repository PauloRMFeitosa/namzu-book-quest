-- Fase 3 (docs/roadmap.md) — encontros: correções, lembretes, presença e ata.
--
-- O que muda:
--   1. Correções do que já existia e não funcionava:
--      - `eventos_tipo_check` recusava o tipo `encontro`, que é o padrão do
--        formulário do app;
--      - `evento_participantes_status_check` recusava `talvez` e `recusado`,
--        as respostas "Talvez" e "Não" do app;
--      - dois gatilhos avisavam o mesmo encontro novo, e cada membro recebia
--        duas notificações. Fica só `trg_notif_clube_novo_evento`, que não
--        avisa quem criou o encontro.
--   2. Lembrete automático no app 24 h e 1 h antes do encontro.
--   3. Lista de presença (`evento_presencas`), marcada pelo organizador.
--   4. Ata do encontro (`evento_atas`), escrita pelo organizador e lida só por
--      quem faz parte do clube.

-- ---------------------------------------------------------------------------
-- 1. Correções
-- ---------------------------------------------------------------------------
ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_tipo_check;
ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'encontro', 'live', 'debate', 'leitura_coletiva', 'presencial', 'workshop', 'autor_convidado'
  ]));

ALTER TABLE public.evento_participantes DROP CONSTRAINT IF EXISTS evento_participantes_status_check;
ALTER TABLE public.evento_participantes
  ADD CONSTRAINT evento_participantes_status_check
  CHECK (status = ANY (ARRAY['confirmado', 'talvez', 'recusado', 'cancelado', 'participou']));

-- A função `notify_novo_evento` fica no banco, sem uso, para a reversão ser
-- só recriar o gatilho.
DROP TRIGGER IF EXISTS trg_notify_novo_evento ON public.eventos;

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
    'clube_novo_conteudo',
    'meta_diaria_lembrete',
    'clube_meta_leitura',
    'clube_lembrete_evento'  -- novo: lembrete de encontro
  ]));

-- ---------------------------------------------------------------------------
-- 2. Lembretes de encontro
-- ---------------------------------------------------------------------------
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS lembrete_24h_em timestamptz,
  ADD COLUMN IF NOT EXISTS lembrete_1h_em timestamptz;

COMMENT ON COLUMN public.eventos.lembrete_24h_em IS 'Quando o lembrete de 24 h foi enviado. Nulo se ainda não foi.';
COMMENT ON COLUMN public.eventos.lembrete_1h_em IS 'Quando o lembrete de 1 h foi enviado. Nulo se ainda não foi.';

-- Encontro remarcado volta a ter direito aos dois lembretes.
CREATE OR REPLACE FUNCTION public.fn_eventos_remarcado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.inicio_em IS DISTINCT FROM OLD.inicio_em THEN
    NEW.lembrete_24h_em := NULL;
    NEW.lembrete_1h_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eventos_remarcado ON public.eventos;
CREATE TRIGGER trg_eventos_remarcado
  BEFORE UPDATE OF inicio_em ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.fn_eventos_remarcado();

-- Roda a cada 15 minutos. Avisa os membros ativos que não recusaram:
--   - 24 h antes: entre 24 h e 2 h do início, se o encontro foi criado há mais
--     de 2 h (quem acabou de ser avisado do encontro novo não recebe outro);
--   - 1 h antes: na última hora, se o encontro foi criado há mais de 15 min.
-- Cada lembrete sai uma vez por encontro.
CREATE OR REPLACE FUNCTION public.processar_lembretes_encontro()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agora timestamptz := now();
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  r record;
  v_dia date;
  v_quando text;
  v_texto text;
  v_enviados integer;
  v_total integer := 0;
BEGIN
  FOR r IN
    SELECT e.id, e.clube_id, e.titulo, e.inicio_em, c.nome AS clube,
           (e.inicio_em <= v_agora + interval '1 hour') AS ultima_hora
    FROM public.eventos e
    JOIN public.clubes c ON c.id = e.clube_id
    WHERE c.is_ativo
      AND e.inicio_em > v_agora
      AND (
        (e.lembrete_1h_em IS NULL
          AND e.inicio_em <= v_agora + interval '1 hour'
          AND COALESCE(e.created_at, '-infinity'::timestamptz) < v_agora - interval '15 minutes')
        OR
        (e.lembrete_24h_em IS NULL
          AND e.inicio_em <= v_agora + interval '24 hours'
          AND e.inicio_em > v_agora + interval '2 hours'
          AND COALESCE(e.created_at, '-infinity'::timestamptz) < v_agora - interval '2 hours')
      )
    ORDER BY e.inicio_em
    FOR UPDATE OF e SKIP LOCKED
  LOOP
    v_dia := (r.inicio_em AT TIME ZONE 'America/Sao_Paulo')::date;
    v_quando := CASE v_dia - v_hoje
        WHEN 0 THEN 'hoje'
        WHEN 1 THEN 'amanhã'
        ELSE 'dia ' || to_char(r.inicio_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
      END || ', às ' || to_char(r.inicio_em AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');

    v_texto := CASE WHEN r.ultima_hora
      THEN 'O encontro "' || r.titulo || '" do clube "' || COALESCE(r.clube, 'seu clube') || '" começa ' || v_quando || '.'
      ELSE 'O encontro "' || r.titulo || '" do clube "' || COALESCE(r.clube, 'seu clube') || '" é ' || v_quando || '.'
    END;

    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, link_url)
    SELECT cm.user_id,
           'clube_lembrete_evento',
           CASE WHEN r.ultima_hora THEN 'Encontro daqui a pouco' ELSE 'Lembrete de encontro' END,
           v_texto || CASE
             WHEN ep.status = 'confirmado' THEN ' Você confirmou presença.'
             WHEN ep.status IS NULL AND NOT r.ultima_hora THEN ' Responda se você vai.'
             ELSE ''
           END,
           r.id,
           '/clubes/' || r.clube_id || '?tab=eventos'
    FROM public.clube_membros cm
    LEFT JOIN public.evento_participantes ep ON ep.evento_id = r.id AND ep.user_id = cm.user_id
    WHERE cm.clube_id = r.clube_id
      AND cm.status = 'ativo'
      AND COALESCE(ep.status, '') NOT IN ('recusado', 'cancelado');

    GET DIAGNOSTICS v_enviados = ROW_COUNT;
    v_total := v_total + v_enviados;

    IF r.ultima_hora THEN
      UPDATE public.eventos SET lembrete_1h_em = v_agora WHERE id = r.id;
    ELSE
      UPDATE public.eventos SET lembrete_24h_em = v_agora WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.processar_lembretes_encontro() IS
  'Agendador: lembra no app os membros do clube 24 h e 1 h antes de cada encontro.';

REVOKE ALL ON FUNCTION public.processar_lembretes_encontro() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_lembretes_encontro() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('lembretes-encontro', '*/15 * * * *', 'SELECT public.processar_lembretes_encontro()');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Lista de presença
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evento_presencas (
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marcado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, user_id)
);

COMMENT ON TABLE public.evento_presencas IS
  'Quem esteve no encontro, marcado pelo organizador do clube.';

CREATE INDEX IF NOT EXISTS idx_evento_presencas_user ON public.evento_presencas (user_id);

-- Quem organiza o clube do encontro (ou é admin).
CREATE OR REPLACE FUNCTION public.pode_gerir_evento(p_evento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = p_evento_id
      AND e.clube_id IS NOT NULL
      AND (public.is_clube_curador(auth.uid(), e.clube_id)
           OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
$$;

-- Quem faz parte do clube do encontro: membro ativo, organizador ou admin.
CREATE OR REPLACE FUNCTION public.participa_do_clube_do_evento(p_evento_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = p_evento_id
      AND e.clube_id IS NOT NULL
      AND (public.is_clube_membro(p_user_id, e.clube_id)
           OR public.is_clube_curador(p_user_id, e.clube_id))
  );
$$;

REVOKE ALL ON FUNCTION public.pode_gerir_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_evento(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.participa_do_clube_do_evento(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.participa_do_clube_do_evento(uuid, uuid) TO authenticated, service_role;

ALTER TABLE public.evento_presencas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver presenca do clube" ON public.evento_presencas;
CREATE POLICY "ver presenca do clube" ON public.evento_presencas
  FOR SELECT TO authenticated
  USING (
    public.participa_do_clube_do_evento(evento_id, (select auth.uid()))
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

-- Só entra na lista quem faz parte do clube.
DROP POLICY IF EXISTS "organizador marca presenca" ON public.evento_presencas;
CREATE POLICY "organizador marca presenca" ON public.evento_presencas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.pode_gerir_evento(evento_id)
    AND public.participa_do_clube_do_evento(evento_id, user_id)
  );

DROP POLICY IF EXISTS "organizador desmarca presenca" ON public.evento_presencas;
CREATE POLICY "organizador desmarca presenca" ON public.evento_presencas
  FOR DELETE TO authenticated
  USING (public.pode_gerir_evento(evento_id));

REVOKE ALL ON TABLE public.evento_presencas FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.evento_presencas TO authenticated;
GRANT INSERT (evento_id, user_id) ON TABLE public.evento_presencas TO authenticated;
GRANT ALL ON TABLE public.evento_presencas TO service_role;

-- Grava a lista inteira de uma vez: quem está em `p_presentes` fica marcado,
-- quem não está é desmarcado. Roda com as permissões de quem chama.
CREATE OR REPLACE FUNCTION public.evento_salvar_presenca(p_evento_id uuid, p_presentes uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_presentes uuid[] := COALESCE(p_presentes, '{}'::uuid[]);
  v_total integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.pode_gerir_evento(p_evento_id) THEN
    RAISE EXCEPTION 'Só o organizador do clube marca a presença.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_presentes) u
    WHERE NOT public.participa_do_clube_do_evento(p_evento_id, u)
  ) THEN
    RAISE EXCEPTION 'A lista tem alguém que não faz parte do clube.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.evento_presencas p
   WHERE p.evento_id = p_evento_id AND NOT (p.user_id = ANY (v_presentes));

  INSERT INTO public.evento_presencas (evento_id, user_id)
  SELECT p_evento_id, u
    FROM (SELECT DISTINCT unnest(v_presentes) AS u) x
   WHERE NOT EXISTS (
     SELECT 1 FROM public.evento_presencas p WHERE p.evento_id = p_evento_id AND p.user_id = x.u
   );

  SELECT count(*) INTO v_total FROM public.evento_presencas WHERE evento_id = p_evento_id;
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.evento_salvar_presenca(uuid, uuid[]) IS
  'Grava a lista de presença de um encontro. Só organizador do clube e admins.';

REVOKE ALL ON FUNCTION public.evento_salvar_presenca(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evento_salvar_presenca(uuid, uuid[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Ata do encontro
-- ---------------------------------------------------------------------------
-- Fica em tabela própria porque `eventos` de clube público é legível por
-- qualquer pessoa, e a ata é só para quem faz parte do clube.
CREATE TABLE IF NOT EXISTS public.evento_atas (
  evento_id uuid PRIMARY KEY REFERENCES public.eventos(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 20000),
  atualizado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.evento_atas IS
  'Ata do encontro: o que foi conversado e combinado. Uma por encontro.';

CREATE OR REPLACE FUNCTION public.fn_evento_atas_carimbo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.texto := btrim(NEW.texto);
  NEW.atualizado_em := now();
  NEW.atualizado_por := COALESCE(auth.uid(), NEW.atualizado_por);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evento_atas_carimbo ON public.evento_atas;
CREATE TRIGGER trg_evento_atas_carimbo
  BEFORE INSERT OR UPDATE ON public.evento_atas
  FOR EACH ROW EXECUTE FUNCTION public.fn_evento_atas_carimbo();

ALTER TABLE public.evento_atas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver ata do clube" ON public.evento_atas;
CREATE POLICY "ver ata do clube" ON public.evento_atas
  FOR SELECT TO authenticated
  USING (
    public.participa_do_clube_do_evento(evento_id, (select auth.uid()))
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "organizador cria ata" ON public.evento_atas;
CREATE POLICY "organizador cria ata" ON public.evento_atas
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_evento(evento_id));

DROP POLICY IF EXISTS "organizador altera ata" ON public.evento_atas;
CREATE POLICY "organizador altera ata" ON public.evento_atas
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_evento(evento_id))
  WITH CHECK (public.pode_gerir_evento(evento_id));

DROP POLICY IF EXISTS "organizador remove ata" ON public.evento_atas;
CREATE POLICY "organizador remove ata" ON public.evento_atas
  FOR DELETE TO authenticated
  USING (public.pode_gerir_evento(evento_id));

REVOKE ALL ON TABLE public.evento_atas FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.evento_atas TO authenticated;
GRANT INSERT (evento_id, texto) ON TABLE public.evento_atas TO authenticated;
GRANT UPDATE (texto) ON TABLE public.evento_atas TO authenticated;
GRANT ALL ON TABLE public.evento_atas TO service_role;

-- Grava a ata. Texto vazio apaga. Roda com as permissões de quem chama.
CREATE OR REPLACE FUNCTION public.evento_salvar_ata(p_evento_id uuid, p_texto text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_texto text := btrim(COALESCE(p_texto, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.pode_gerir_evento(p_evento_id) THEN
    RAISE EXCEPTION 'Só o organizador do clube escreve a ata.' USING ERRCODE = '42501';
  END IF;

  IF v_texto = '' THEN
    DELETE FROM public.evento_atas WHERE evento_id = p_evento_id;
    RETURN false;
  END IF;

  IF char_length(v_texto) > 20000 THEN
    RAISE EXCEPTION 'A ata aceita até 20.000 caracteres.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.evento_atas SET texto = v_texto WHERE evento_id = p_evento_id;
  IF NOT FOUND THEN
    INSERT INTO public.evento_atas (evento_id, texto) VALUES (p_evento_id, v_texto);
  END IF;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.evento_salvar_ata(uuid, text) IS
  'Grava ou apaga a ata de um encontro. Só organizador do clube e admins.';

REVOKE ALL ON FUNCTION public.evento_salvar_ata(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evento_salvar_ata(uuid, text) TO authenticated, service_role;
