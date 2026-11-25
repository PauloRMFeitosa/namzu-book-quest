-- Fase 3 (docs/roadmap.md) — encontros, parte 2: votação de data.
--
-- Aplicada no remoto em 25/11/2026 (versão 20261125174544).
--
-- O organizador propõe de 2 a 6 datas, os membros marcam em quais podem ir e o
-- organizador encerra escolhendo uma. O encerramento cria o encontro e já
-- confirma a presença de quem votou na data escolhida.
--
-- O que muda:
--   1. Tabelas `clube_votacoes_data`, `clube_votacao_opcoes` e
--      `clube_votacao_votos`, com RLS. Um clube tem no máximo uma votação
--      aberta por vez.
--   2. Funções `clube_abrir_votacao_data`, `clube_votar_data`,
--      `clube_encerrar_votacao_data` e `clube_cancelar_votacao_data`.
--   3. Tipo de notificação `clube_votacao_data`.

-- ---------------------------------------------------------------------------
-- 1. Tipo de notificação
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
    'clube_novo_conteudo',
    'meta_diaria_lembrete',
    'clube_meta_leitura',
    'clube_lembrete_evento',
    'clube_votacao_data'  -- novo: votação de data aberta
  ]));

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clube_votacoes_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clube_id uuid NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120),
  url_evento text CHECK (url_evento IS NULL OR char_length(url_evento) <= 500),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'encerrada', 'cancelada')),
  -- Encontro criado quando a votação foi encerrada.
  evento_id uuid REFERENCES public.eventos(id) ON DELETE SET NULL,
  criado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  encerrada_em timestamptz
);

COMMENT ON TABLE public.clube_votacoes_data IS
  'Votação para escolher a data do próximo encontro do clube.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_clube_votacoes_data_aberta
  ON public.clube_votacoes_data (clube_id) WHERE status = 'aberta';
CREATE INDEX IF NOT EXISTS idx_clube_votacoes_data_clube ON public.clube_votacoes_data (clube_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clube_votacao_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  votacao_id uuid NOT NULL REFERENCES public.clube_votacoes_data(id) ON DELETE CASCADE,
  inicio_em timestamptz NOT NULL,
  UNIQUE (votacao_id, inicio_em)
);

CREATE TABLE IF NOT EXISTS public.clube_votacao_votos (
  opcao_id uuid NOT NULL REFERENCES public.clube_votacao_opcoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opcao_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clube_votacao_votos_user ON public.clube_votacao_votos (user_id);

-- Quem faz parte do clube: membro ativo, organizador ou admin.
CREATE OR REPLACE FUNCTION public.participa_do_clube(p_clube_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_clube_membro(p_user_id, p_clube_id)
      OR public.is_clube_curador(p_user_id, p_clube_id)
      OR public.has_role(p_user_id, 'admin'::public.app_role);
$$;

-- Clube de uma votação, para as políticas das tabelas filhas.
CREATE OR REPLACE FUNCTION public.clube_da_votacao_data(p_votacao_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.clube_id FROM public.clube_votacoes_data v WHERE v.id = p_votacao_id;
$$;

CREATE OR REPLACE FUNCTION public.clube_da_opcao_de_data(p_opcao_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.clube_id
  FROM public.clube_votacao_opcoes o
  JOIN public.clube_votacoes_data v ON v.id = o.votacao_id
  WHERE o.id = p_opcao_id;
$$;

REVOKE ALL ON FUNCTION public.participa_do_clube(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.participa_do_clube(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.clube_da_votacao_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_da_votacao_data(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.clube_da_opcao_de_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_da_opcao_de_data(uuid) TO authenticated, service_role;

ALTER TABLE public.clube_votacoes_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clube_votacao_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clube_votacao_votos ENABLE ROW LEVEL SECURITY;

-- Leitura para quem faz parte do clube. Toda escrita passa pelas funções
-- abaixo, que conferem quem chama.
DROP POLICY IF EXISTS "ver votacoes do clube" ON public.clube_votacoes_data;
CREATE POLICY "ver votacoes do clube" ON public.clube_votacoes_data
  FOR SELECT TO authenticated
  USING (public.participa_do_clube(clube_id, (select auth.uid())));

DROP POLICY IF EXISTS "ver opcoes do clube" ON public.clube_votacao_opcoes;
CREATE POLICY "ver opcoes do clube" ON public.clube_votacao_opcoes
  FOR SELECT TO authenticated
  USING (public.participa_do_clube(public.clube_da_votacao_data(votacao_id), (select auth.uid())));

DROP POLICY IF EXISTS "ver votos do clube" ON public.clube_votacao_votos;
CREATE POLICY "ver votos do clube" ON public.clube_votacao_votos
  FOR SELECT TO authenticated
  USING (public.participa_do_clube(public.clube_da_opcao_de_data(opcao_id), (select auth.uid())));

REVOKE ALL ON TABLE public.clube_votacoes_data, public.clube_votacao_opcoes, public.clube_votacao_votos
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.clube_votacoes_data, public.clube_votacao_opcoes, public.clube_votacao_votos
  TO authenticated;
GRANT ALL ON TABLE public.clube_votacoes_data, public.clube_votacao_opcoes, public.clube_votacao_votos
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Funções
-- ---------------------------------------------------------------------------
-- As quatro são SECURITY DEFINER porque as tabelas não aceitam escrita direta.
-- Cada uma confere quem chama logo no início.

-- Abre a votação com as datas propostas e avisa os membros.
CREATE OR REPLACE FUNCTION public.clube_abrir_votacao_data(
  p_clube_id uuid,
  p_titulo text,
  p_opcoes timestamptz[],
  p_url_evento text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_titulo text := btrim(COALESCE(p_titulo, ''));
  v_url text := NULLIF(btrim(COALESCE(p_url_evento, '')), '');
  v_opcoes timestamptz[];
  v_id uuid;
  v_clube text;
BEGIN
  IF v_uid IS NULL
     OR NOT (public.is_clube_curador(v_uid, p_clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só o organizador do clube abre a votação.' USING ERRCODE = '42501';
  END IF;

  SELECT c.nome INTO v_clube FROM public.clubes c WHERE c.id = p_clube_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clube não encontrado.' USING ERRCODE = '42501';
  END IF;

  IF v_titulo = '' OR char_length(v_titulo) > 120 THEN
    RAISE EXCEPTION 'Dê um nome de até 120 letras para o encontro.' USING ERRCODE = '22023';
  END IF;
  IF v_url IS NOT NULL AND char_length(v_url) > 500 THEN
    RAISE EXCEPTION 'O link do encontro é longo demais.' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(DISTINCT o ORDER BY o) INTO v_opcoes FROM unnest(COALESCE(p_opcoes, '{}'::timestamptz[])) o;
  IF v_opcoes IS NULL OR array_length(v_opcoes, 1) < 2 OR array_length(v_opcoes, 1) > 6 THEN
    RAISE EXCEPTION 'Proponha de 2 a 6 datas diferentes.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_opcoes) o WHERE o <= now()) THEN
    RAISE EXCEPTION 'Todas as datas precisam estar no futuro.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clube_votacoes_data v WHERE v.clube_id = p_clube_id AND v.status = 'aberta') THEN
    RAISE EXCEPTION 'O clube já tem uma votação de data aberta.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.clube_votacoes_data (clube_id, titulo, url_evento, criado_por)
  VALUES (p_clube_id, v_titulo, v_url, v_uid)
  RETURNING id INTO v_id;

  INSERT INTO public.clube_votacao_opcoes (votacao_id, inicio_em)
  SELECT v_id, o FROM unnest(v_opcoes) o;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, link_url)
  SELECT cm.user_id,
         'clube_votacao_data',
         'Vote na data do encontro',
         'O clube "' || COALESCE(v_clube, 'seu clube') || '" está escolhendo a data de "' || v_titulo || '". Marque quando você pode.',
         v_id,
         '/clubes/' || p_clube_id || '?tab=eventos'
  FROM public.clube_membros cm
  WHERE cm.clube_id = p_clube_id AND cm.status = 'ativo' AND cm.user_id <> v_uid;

  RETURN v_id;
END;
$$;

-- Grava o voto de quem chama: fica marcado exatamente o que vier em
-- `p_opcoes`. Lista vazia retira o voto.
CREATE OR REPLACE FUNCTION public.clube_votar_data(p_votacao_id uuid, p_opcoes uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_votacao record;
  v_opcoes uuid[] := COALESCE(p_opcoes, '{}'::uuid[]);
  v_total integer;
BEGIN
  SELECT v.id, v.clube_id, v.status INTO v_votacao FROM public.clube_votacoes_data v WHERE v.id = p_votacao_id;

  IF v_uid IS NULL
     OR v_votacao.id IS NULL
     OR NOT (public.is_clube_membro(v_uid, v_votacao.clube_id) OR public.is_clube_curador(v_uid, v_votacao.clube_id)) THEN
    RAISE EXCEPTION 'Só quem faz parte do clube vota.' USING ERRCODE = '42501';
  END IF;
  IF v_votacao.status <> 'aberta' THEN
    RAISE EXCEPTION 'Esta votação já foi encerrada.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_opcoes) o
    WHERE NOT EXISTS (SELECT 1 FROM public.clube_votacao_opcoes x WHERE x.id = o AND x.votacao_id = p_votacao_id)
  ) THEN
    RAISE EXCEPTION 'Há uma data que não é desta votação.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.clube_votacao_votos vt
   USING public.clube_votacao_opcoes o
   WHERE o.id = vt.opcao_id AND o.votacao_id = p_votacao_id
     AND vt.user_id = v_uid AND NOT (vt.opcao_id = ANY (v_opcoes));

  INSERT INTO public.clube_votacao_votos (opcao_id, user_id)
  SELECT DISTINCT o, v_uid FROM unnest(v_opcoes) o
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_total
  FROM public.clube_votacao_votos vt
  JOIN public.clube_votacao_opcoes o ON o.id = vt.opcao_id
  WHERE o.votacao_id = p_votacao_id AND vt.user_id = v_uid;
  RETURN v_total;
END;
$$;

-- Encerra a votação na data escolhida: cria o encontro (o gatilho de encontro
-- novo avisa os membros) e confirma a presença de quem votou nessa data.
CREATE OR REPLACE FUNCTION public.clube_encerrar_votacao_data(p_votacao_id uuid, p_opcao_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_votacao record;
  v_inicio timestamptz;
  v_evento uuid;
BEGIN
  SELECT v.id, v.clube_id, v.status, v.titulo, v.url_evento INTO v_votacao
  FROM public.clube_votacoes_data v WHERE v.id = p_votacao_id FOR UPDATE;

  IF v_uid IS NULL
     OR v_votacao.id IS NULL
     OR NOT (public.is_clube_curador(v_uid, v_votacao.clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só o organizador do clube encerra a votação.' USING ERRCODE = '42501';
  END IF;
  IF v_votacao.status <> 'aberta' THEN
    RAISE EXCEPTION 'Esta votação já foi encerrada.' USING ERRCODE = '22023';
  END IF;

  SELECT o.inicio_em INTO v_inicio FROM public.clube_votacao_opcoes o
  WHERE o.id = p_opcao_id AND o.votacao_id = p_votacao_id;
  IF v_inicio IS NULL THEN
    RAISE EXCEPTION 'Escolha uma das datas da votação.' USING ERRCODE = '22023';
  END IF;
  IF v_inicio <= now() THEN
    RAISE EXCEPTION 'Essa data já passou. Escolha outra ou cancele a votação.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.eventos (clube_id, criador_id, titulo, tipo, inicio_em, url_evento)
  VALUES (v_votacao.clube_id, v_uid, v_votacao.titulo, 'encontro', v_inicio, v_votacao.url_evento)
  RETURNING id INTO v_evento;

  INSERT INTO public.evento_participantes (evento_id, user_id, status)
  SELECT v_evento, vt.user_id, 'confirmado'
  FROM public.clube_votacao_votos vt
  WHERE vt.opcao_id = p_opcao_id
    AND public.is_clube_membro(vt.user_id, v_votacao.clube_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.clube_votacoes_data
     SET status = 'encerrada', evento_id = v_evento, encerrada_em = now()
   WHERE id = p_votacao_id;

  RETURN v_evento;
END;
$$;

CREATE OR REPLACE FUNCTION public.clube_cancelar_votacao_data(p_votacao_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_votacao record;
BEGIN
  SELECT v.id, v.clube_id, v.status INTO v_votacao
  FROM public.clube_votacoes_data v WHERE v.id = p_votacao_id FOR UPDATE;

  IF v_uid IS NULL
     OR v_votacao.id IS NULL
     OR NOT (public.is_clube_curador(v_uid, v_votacao.clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só o organizador do clube cancela a votação.' USING ERRCODE = '42501';
  END IF;
  IF v_votacao.status <> 'aberta' THEN
    RETURN false;
  END IF;

  UPDATE public.clube_votacoes_data SET status = 'cancelada', encerrada_em = now() WHERE id = p_votacao_id;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.clube_abrir_votacao_data(uuid, text, timestamptz[], text) IS
  'Abre a votação de data do próximo encontro. Só organizador do clube e admins.';
COMMENT ON FUNCTION public.clube_votar_data(uuid, uuid[]) IS
  'Grava as datas em que quem chama pode ir. Só quem faz parte do clube.';
COMMENT ON FUNCTION public.clube_encerrar_votacao_data(uuid, uuid) IS
  'Encerra a votação na data escolhida e cria o encontro. Só organizador do clube e admins.';
COMMENT ON FUNCTION public.clube_cancelar_votacao_data(uuid) IS
  'Cancela a votação de data sem criar encontro. Só organizador do clube e admins.';

REVOKE ALL ON FUNCTION public.clube_abrir_votacao_data(uuid, text, timestamptz[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clube_votar_data(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clube_encerrar_votacao_data(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clube_cancelar_votacao_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_abrir_votacao_data(uuid, text, timestamptz[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clube_votar_data(uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clube_encerrar_votacao_data(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clube_cancelar_votacao_data(uuid) TO authenticated, service_role;
