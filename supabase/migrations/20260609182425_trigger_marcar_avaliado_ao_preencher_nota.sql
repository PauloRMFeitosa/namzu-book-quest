
-- Quando o usuário preenche a nota em usuario_livros,
-- marca automaticamente o status de avaliação como AVALIADO.
-- Funciona independentemente de qual caminho o usuário usou para avaliar.
CREATE OR REPLACE FUNCTION trg_fn_marcar_avaliado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Apenas quando nota passa de NULL para um valor (primeira avaliação)
  IF NEW.nota IS NOT NULL AND OLD.nota IS NULL THEN
    UPDATE usuario_livro_avaliacao
       SET status = 'AVALIADO'
     WHERE usuario_livro_id = NEW.id
       AND status != 'AVALIADO';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuario_livros_marcar_avaliado
  AFTER UPDATE OF nota ON usuario_livros
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_marcar_avaliado();
