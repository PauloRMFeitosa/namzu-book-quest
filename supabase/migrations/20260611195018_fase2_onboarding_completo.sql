
-- Adiciona coluna onboarding_completo em perfis
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS onboarding_completo boolean NOT NULL DEFAULT false;

-- Marcar como completo usuários que já têm interesses cadastrados
UPDATE public.perfis p
SET onboarding_completo = true
WHERE EXISTS (
  SELECT 1 FROM public.perfil_interesses pi
  WHERE pi.user_id = p.user_id
);

-- RPC para marcar onboarding como concluído (chamada pelo frontend após o último passo)
CREATE OR REPLACE FUNCTION public.concluir_onboarding()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.perfis
  SET onboarding_completo = true, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.concluir_onboarding() TO authenticated;
