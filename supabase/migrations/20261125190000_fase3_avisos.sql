-- Fase 3 (docs/roadmap.md) — comunicação: aviso do organizador para o clube.
--
-- O organizador escreve um aviso com título e mensagem. Todos os membros
-- ativos recebem uma notificação no app, e o aviso fica guardado no clube
-- para quem chegar depois.
--
-- O que muda:
--   1. Tipo de notificação `clube_aviso`.
--   2. Tabela `clube_avisos`, com RLS.
--   3. Função `clube_enviar_aviso`, com limite de 5 avisos por clube a cada
--      24 horas.

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
    'clube_votacao_data',
    'clube_aviso'  -- novo: aviso do organizador
  ]));

-- ---------------------------------------------------------------------------
-- 2. Avisos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clube_avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clube_id uuid NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  autor_id uuid DEFAULT auth.uid(),
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120),
  mensagem text NOT NULL CHECK (char_length(btrim(mensagem)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clube_avisos IS
  'Avisos do organizador para todos os membros do clube.';

CREATE INDEX IF NOT EXISTS idx_clube_avisos_clube ON public.clube_avisos (clube_id, created_at DESC);

ALTER TABLE public.clube_avisos ENABLE ROW LEVEL SECURITY;

-- Quem faz parte do clube lê. O envio passa pela função abaixo.
DROP POLICY IF EXISTS "ver avisos do clube" ON public.clube_avisos;
CREATE POLICY "ver avisos do clube" ON public.clube_avisos
  FOR SELECT TO authenticated
  USING (public.participa_do_clube(clube_id, (select auth.uid())));

DROP POLICY IF EXISTS "organizador remove avisos" ON public.clube_avisos;
CREATE POLICY "organizador remove avisos" ON public.clube_avisos
  FOR DELETE TO authenticated
  USING (
    public.is_clube_curador((select auth.uid()), clube_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

REVOKE ALL ON TABLE public.clube_avisos FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.clube_avisos TO authenticated;
GRANT ALL ON TABLE public.clube_avisos TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Enviar aviso
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER porque a tabela não aceita escrita direta e porque grava as
-- notificações dos membros. Confere quem chama logo no início.
CREATE OR REPLACE FUNCTION public.clube_enviar_aviso(p_clube_id uuid, p_titulo text, p_mensagem text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_titulo text := btrim(COALESCE(p_titulo, ''));
  v_mensagem text := btrim(COALESCE(p_mensagem, ''));
  v_clube text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL
     OR NOT (public.is_clube_curador(v_uid, p_clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só o organizador do clube envia avisos.' USING ERRCODE = '42501';
  END IF;

  SELECT c.nome INTO v_clube FROM public.clubes c WHERE c.id = p_clube_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clube não encontrado.' USING ERRCODE = '42501';
  END IF;

  IF v_titulo = '' OR char_length(v_titulo) > 120 THEN
    RAISE EXCEPTION 'Dê um título de até 120 letras para o aviso.' USING ERRCODE = '22023';
  END IF;
  IF v_mensagem = '' OR char_length(v_mensagem) > 2000 THEN
    RAISE EXCEPTION 'Escreva a mensagem do aviso, com até 2.000 caracteres.' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM public.clube_avisos a
      WHERE a.clube_id = p_clube_id AND a.created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'O clube já enviou 5 avisos nas últimas 24 horas. Tente de novo mais tarde.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.clube_avisos (clube_id, autor_id, titulo, mensagem)
  VALUES (p_clube_id, v_uid, v_titulo, v_mensagem)
  RETURNING id INTO v_id;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, link_url)
  SELECT cm.user_id,
         'clube_aviso',
         v_titulo,
         'Aviso do clube "' || COALESCE(v_clube, 'seu clube') || '": '
           || CASE WHEN char_length(v_mensagem) > 280 THEN left(v_mensagem, 280) || '…' ELSE v_mensagem END,
         v_id,
         '/clubes/' || p_clube_id || '?avisos=1'
  FROM public.clube_membros cm
  WHERE cm.clube_id = p_clube_id AND cm.status = 'ativo' AND cm.user_id <> v_uid;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.clube_enviar_aviso(uuid, text, text) IS
  'Envia um aviso do organizador a todos os membros ativos do clube. Só organizador e admins.';

REVOKE ALL ON FUNCTION public.clube_enviar_aviso(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_enviar_aviso(uuid, text, text) TO authenticated, service_role;
