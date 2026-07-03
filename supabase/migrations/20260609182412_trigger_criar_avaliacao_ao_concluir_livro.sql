
-- Consolida o updated_at usando a função genérica já existente no projeto
DROP TRIGGER IF EXISTS trg_usuario_livro_avaliacao_updated_at ON usuario_livro_avaliacao;
DROP FUNCTION IF EXISTS update_usuario_livro_avaliacao_updated_at();

CREATE TRIGGER trg_usuario_livro_avaliacao_updated_at
  BEFORE UPDATE ON usuario_livro_avaliacao
  FOR EACH ROW
  EXECUTE FUNCTION tg_touch_updated_at();

-- Função: cria a linha de avaliação quando o livro é marcado como 'lido'
CREATE OR REPLACE FUNCTION trg_fn_criar_avaliacao_livro()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Disparado em INSERT com status 'lido' ou UPDATE que muda para 'lido'
  IF NEW.status = 'lido' AND (OLD.status IS DISTINCT FROM 'lido') THEN
    INSERT INTO usuario_livro_avaliacao (usuario_livro_id)
    VALUES (NEW.id)
    ON CONFLICT (usuario_livro_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger em INSERT (usuário adiciona livro já com status 'lido')
CREATE TRIGGER trg_usuario_livros_criar_avaliacao_insert
  AFTER INSERT ON usuario_livros
  FOR EACH ROW
  WHEN (NEW.status = 'lido')
  EXECUTE FUNCTION trg_fn_criar_avaliacao_livro();

-- Trigger em UPDATE (usuário muda status para 'lido')
CREATE TRIGGER trg_usuario_livros_criar_avaliacao_update
  AFTER UPDATE OF status ON usuario_livros
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_criar_avaliacao_livro();
