
-- ============================================================
-- Fase 1 — Loop Social: RPCs e Views
-- ============================================================

-- 1. RPC: seguir_usuario
CREATE OR REPLACE FUNCTION public.seguir_usuario(p_seguido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF auth.uid() = p_seguido_id THEN
    RAISE EXCEPTION 'Não é possível seguir a si mesmo';
  END IF;

  INSERT INTO public.conexoes (seguidor_id, seguido_id, status)
  VALUES (auth.uid(), p_seguido_id, 'ativo')
  ON CONFLICT (seguidor_id, seguido_id)
  DO UPDATE SET status = 'ativo';
END;
$$;

GRANT EXECUTE ON FUNCTION public.seguir_usuario(uuid) TO authenticated;

-- 2. RPC: desseguir_usuario
CREATE OR REPLACE FUNCTION public.desseguir_usuario(p_seguido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  DELETE FROM public.conexoes
  WHERE seguidor_id = auth.uid()
    AND seguido_id = p_seguido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.desseguir_usuario(uuid) TO authenticated;

-- 3. View: v_seguidores
-- Dado um usuario_id, retorna todos que o seguem
CREATE OR REPLACE VIEW public.v_seguidores AS
SELECT
  c.seguido_id   AS usuario_id,
  c.seguidor_id,
  p.nome_exibicao,
  p.username,
  p.avatar_url,
  p.slug,
  c.created_at
FROM public.conexoes c
JOIN public.perfis p ON p.user_id = c.seguidor_id
WHERE c.status = 'ativo';

GRANT SELECT ON public.v_seguidores TO authenticated;

-- 4. View: v_seguindo
-- Dado um usuario_id, retorna todos que ele segue
CREATE OR REPLACE VIEW public.v_seguindo AS
SELECT
  c.seguidor_id  AS usuario_id,
  c.seguido_id,
  p.nome_exibicao,
  p.username,
  p.avatar_url,
  p.slug,
  c.created_at
FROM public.conexoes c
JOIN public.perfis p ON p.user_id = c.seguido_id
WHERE c.status = 'ativo';

GRANT SELECT ON public.v_seguindo TO authenticated;

-- 5. Helper: is_seguindo(p_seguido_id)
-- Usado no BotaoSeguir para estado inicial
CREATE OR REPLACE FUNCTION public.is_seguindo(p_seguido_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conexoes
    WHERE seguidor_id = auth.uid()
      AND seguido_id = p_seguido_id
      AND status = 'ativo'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_seguindo(uuid) TO authenticated;
