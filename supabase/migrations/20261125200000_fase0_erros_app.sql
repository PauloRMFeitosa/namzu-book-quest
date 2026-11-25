-- Fase 0 (docs/roadmap.md) — monitoramento de erros em produção.
--
-- Hoje um erro no app só aparece se a pessoa avisar. Esta tabela guarda os
-- erros que o navegador encontra (erro não tratado, promessa rejeitada, tela
-- que quebrou e consulta que falhou), para o admin acompanhar em
-- Admin > Erros do app. O app grava por `src/services/monitoramento.ts`.
--
-- Regras:
--   - Só usuário logado grava, e só em nome próprio: `user_id` e `criado_em`
--     são preenchidos pelo banco.
--   - No máximo 30 erros por pessoa por hora; o que passar disso é descartado
--     em silêncio, para um laço de erro não encher a tabela.
--   - Só admin lê. Ninguém altera nem apaga pela API.
--   - Os erros são apagados depois de 30 dias.
--   - Não guarda texto digitado pela pessoa: só mensagem técnica, pilha, rota
--     sem parâmetros, versão do app e navegador.
--
-- Não altera nenhuma tabela existente.

CREATE TABLE IF NOT EXISTS public.erros_app (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  origem text NOT NULL CHECK (origem IN ('erro', 'promessa', 'react', 'consulta')),
  assinatura text NOT NULL CHECK (assinatura ~ '^[a-z0-9]{4,16}$'),
  mensagem text NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 500),
  pilha text CHECK (pilha IS NULL OR char_length(pilha) <= 4000),
  rota text CHECK (rota IS NULL OR char_length(rota) <= 200),
  versao text CHECK (versao IS NULL OR char_length(versao) <= 40),
  ambiente text NOT NULL DEFAULT 'producao' CHECK (ambiente IN ('producao', 'preview')),
  navegador text CHECK (navegador IS NULL OR char_length(navegador) <= 300)
);

COMMENT ON TABLE public.erros_app IS
  'Erros encontrados pelo app no navegador (src/services/monitoramento.ts). Ver docs/monitoramento.md.';

CREATE INDEX IF NOT EXISTS erros_app_criado_em_idx ON public.erros_app (criado_em DESC);
CREATE INDEX IF NOT EXISTS erros_app_user_criado_em_idx ON public.erros_app (user_id, criado_em DESC);

ALTER TABLE public.erros_app ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.erros_app FROM PUBLIC, anon, authenticated;
GRANT INSERT (origem, assinatura, mensagem, pilha, rota, versao, ambiente, navegador)
  ON public.erros_app TO authenticated;
GRANT SELECT ON public.erros_app TO authenticated;
GRANT ALL ON public.erros_app TO service_role;

DROP POLICY IF EXISTS "registrar erro proprio" ON public.erros_app;
CREATE POLICY "registrar erro proprio" ON public.erros_app
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin le erros" ON public.erros_app;
CREATE POLICY "admin le erros" ON public.erros_app
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Limite por pessoa: descarta em silêncio o que passar de 30 por hora.
CREATE OR REPLACE FUNCTION public.erros_app_limite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (
    SELECT count(*) FROM public.erros_app
    WHERE user_id = NEW.user_id AND criado_em > now() - interval '1 hour'
  ) >= 30 THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.erros_app_limite() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_erros_app_limite ON public.erros_app;
CREATE TRIGGER trg_erros_app_limite
  BEFORE INSERT ON public.erros_app
  FOR EACH ROW EXECUTE FUNCTION public.erros_app_limite();

-- Retenção: 30 dias.
CREATE OR REPLACE FUNCTION public.limpar_erros_app()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  apagados integer;
BEGIN
  DELETE FROM public.erros_app WHERE criado_em < now() - interval '30 days';
  GET DIAGNOSTICS apagados = ROW_COUNT;
  RETURN apagados;
END;
$$;

REVOKE ALL ON FUNCTION public.limpar_erros_app() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limpar_erros_app() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Todo dia às 4h de Brasília (7h UTC).
    PERFORM cron.schedule('limpar-erros-app', '0 7 * * *', 'SELECT public.limpar_erros_app()');
  END IF;
END;
$$;
