-- Fase 2 (docs/roadmap.md) — registro de eventos de produto.
--
-- Aplicada no remoto em 25/11/2026 (versão 20261125131535).
--
-- Hoje nada mede o uso do app: o funil de onboarding chamava o Google
-- Analytics, que nunca foi instalado. Esta tabela guarda os eventos que o
-- roadmap pede para acompanhar o piloto (clube criado, convite gerado, membro
-- entrou, progresso registrado, encontro criado, RSVP respondido e roteiro de
-- IA gerado). O app grava por `src/services/analytics.ts`.
--
-- Regras:
--   - Só usuário logado grava, e só em nome próprio: `user_id` e `criado_em`
--     são preenchidos pelo banco, o app não consegue informar outros valores.
--   - Só admin lê.
--   - Ninguém altera nem apaga pela API.
--   - Apagar a conta apaga os eventos da pessoa.
--
-- Não altera nenhuma tabela existente.

CREATE TABLE IF NOT EXISTS public.eventos_produto (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evento text NOT NULL CHECK (evento ~ '^[a-z][a-z0-9_]{2,49}$'),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  clube_id uuid REFERENCES public.clubes(id) ON DELETE SET NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(props) = 'object' AND pg_column_size(props) <= 2048),
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.eventos_produto IS
  'Eventos de produto gravados pelo app (src/services/analytics.ts). Ver docs/metricas-produto.md.';

CREATE INDEX IF NOT EXISTS eventos_produto_evento_criado_em_idx
  ON public.eventos_produto (evento, criado_em DESC);
CREATE INDEX IF NOT EXISTS eventos_produto_clube_criado_em_idx
  ON public.eventos_produto (clube_id, criado_em DESC) WHERE clube_id IS NOT NULL;

ALTER TABLE public.eventos_produto ENABLE ROW LEVEL SECURITY;

-- Permissões por coluna: o app só informa o evento, o clube e as propriedades.
REVOKE ALL ON public.eventos_produto FROM PUBLIC, anon, authenticated;
GRANT INSERT (evento, clube_id, props) ON public.eventos_produto TO authenticated;
GRANT SELECT ON public.eventos_produto TO authenticated;
GRANT ALL ON public.eventos_produto TO service_role;

DROP POLICY IF EXISTS "registrar evento proprio" ON public.eventos_produto;
CREATE POLICY "registrar evento proprio" ON public.eventos_produto
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin le eventos" ON public.eventos_produto;
CREATE POLICY "admin le eventos" ON public.eventos_produto
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
