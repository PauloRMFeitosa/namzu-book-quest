
-- =============================================
-- RLS: usuario_livro_avaliacao
-- O user_id vem do join com usuario_livros
-- =============================================

ALTER TABLE usuario_livro_avaliacao ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas suas próprias pendências
CREATE POLICY "usuario_livro_avaliacao_select_own"
  ON usuario_livro_avaliacao
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario_livros ul
       WHERE ul.id = usuario_livro_id
         AND ul.user_id = auth.uid()
    )
  );

-- Usuário pode atualizar apenas suas próprias pendências
CREATE POLICY "usuario_livro_avaliacao_update_own"
  ON usuario_livro_avaliacao
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuario_livros ul
       WHERE ul.id = usuario_livro_id
         AND ul.user_id = auth.uid()
    )
  );

-- INSERT é feito apenas via trigger (SECURITY DEFINER não precisa de policy,
-- mas adicionamos para o caso de service role)
CREATE POLICY "usuario_livro_avaliacao_insert_trigger"
  ON usuario_livro_avaliacao
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_livros ul
       WHERE ul.id = usuario_livro_id
         AND ul.user_id = auth.uid()
    )
  );

-- =============================================
-- RPC: dispensar_avaliacao
-- Chamada pelo frontend ao clicar em "Dispensar"
-- =============================================

CREATE OR REPLACE FUNCTION dispensar_avaliacao(
  p_usuario_livro_id uuid,
  p_definitivo       boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Valida que o livro pertence ao usuário autenticado
  SELECT ul.user_id INTO v_user_id
    FROM usuario_livros ul
   WHERE ul.id = p_usuario_livro_id
     AND ul.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Livro não encontrado ou sem permissão.';
  END IF;

  IF p_definitivo THEN
    UPDATE usuario_livro_avaliacao
       SET status       = 'DISPENSADO_DEFINITIVO',
           dispensado_em = now()
     WHERE usuario_livro_id = p_usuario_livro_id;
  ELSE
    UPDATE usuario_livro_avaliacao
       SET status        = 'DISPENSADO_TEMPORARIO',
           dispensado_em = now()
     WHERE usuario_livro_id = p_usuario_livro_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION dispensar_avaliacao IS
  'Dispensa o card de avaliação de um livro. p_definitivo=false → cooldown 7 dias; p_definitivo=true → não reaparece.';
