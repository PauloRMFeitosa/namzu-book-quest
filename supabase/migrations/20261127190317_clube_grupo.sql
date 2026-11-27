-- Grupo do clube no WhatsApp ou no Telegram (docs/divulgacao.md).
--
-- Aplicada no remoto em 27/11/2026 (versão 20261127190317).
--
-- O organizador guarda o link de convite do grupo, e os membros veem o botão
-- "Entrar no grupo" na página do clube.
--
-- Fica em tabela própria, e não em `clubes`, porque `clubes` é lida por
-- qualquer pessoa nos clubes públicos, e o link do grupo é só para quem já
-- faz parte: link de grupo exposto atrai spam.
--
-- Regras:
--   - Leem: membros ativos, quem organiza o clube e admins.
--   - Gravam e apagam: quem organiza o clube (organizador e co-curadores) e admins.
--   - Só link de convite do WhatsApp (chat.whatsapp.com) ou do Telegram (t.me).
--
-- Não altera nenhuma tabela existente.

CREATE TABLE IF NOT EXISTS public.clube_grupos (
  clube_id uuid PRIMARY KEY REFERENCES public.clubes(id) ON DELETE CASCADE,
  link text NOT NULL CHECK (
    char_length(link) <= 200
    AND link ~ '^https://(chat\.whatsapp\.com|t\.me|telegram\.me)/[A-Za-z0-9_+/?=&.-]+$'
  ),
  atualizado_por uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clube_grupos IS
  'Link do grupo do clube no WhatsApp ou no Telegram. Só para quem faz parte do clube.';

CREATE OR REPLACE FUNCTION public.clube_grupos_antes_de_gravar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em := now();
  NEW.atualizado_por := auth.uid();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clube_grupos_antes_de_gravar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS clube_grupos_antes_de_gravar ON public.clube_grupos;
CREATE TRIGGER clube_grupos_antes_de_gravar
  BEFORE INSERT OR UPDATE ON public.clube_grupos
  FOR EACH ROW EXECUTE FUNCTION public.clube_grupos_antes_de_gravar();

ALTER TABLE public.clube_grupos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.clube_grupos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clube_grupos TO authenticated;
GRANT ALL ON public.clube_grupos TO service_role;

DROP POLICY IF EXISTS "quem faz parte le o grupo" ON public.clube_grupos;
CREATE POLICY "quem faz parte le o grupo" ON public.clube_grupos
  FOR SELECT TO authenticated
  USING (
    public.is_clube_membro(auth.uid(), clube_id)
    OR public.is_clube_curador(auth.uid(), clube_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "quem organiza define o grupo" ON public.clube_grupos;
CREATE POLICY "quem organiza define o grupo" ON public.clube_grupos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_clube_curador(auth.uid(), clube_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "quem organiza troca o grupo" ON public.clube_grupos;
CREATE POLICY "quem organiza troca o grupo" ON public.clube_grupos
  FOR UPDATE TO authenticated
  USING (
    public.is_clube_curador(auth.uid(), clube_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.is_clube_curador(auth.uid(), clube_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "quem organiza tira o grupo" ON public.clube_grupos;
CREATE POLICY "quem organiza tira o grupo" ON public.clube_grupos
  FOR DELETE TO authenticated
  USING (
    public.is_clube_curador(auth.uid(), clube_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
