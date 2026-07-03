
-- Índice principal: query da Home (pendentes, excluindo cooldown ativo)
CREATE INDEX idx_usuario_livro_avaliacao_status
  ON usuario_livro_avaliacao (status);

-- Índice para query de cooldown: status + dispensado_em
CREATE INDEX idx_usuario_livro_avaliacao_dispensado_em
  ON usuario_livro_avaliacao (dispensado_em)
  WHERE status = 'DISPENSADO_TEMPORARIO';

-- Índice para fila de notificações 48h
CREATE INDEX idx_usuario_livro_avaliacao_notificacao
  ON usuario_livro_avaliacao (created_at)
  WHERE status = 'PENDENTE' AND notificacao_enviada = false;

-- Trigger de updated_at (reutiliza o padrão já existente no projeto)
CREATE OR REPLACE FUNCTION update_usuario_livro_avaliacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_livro_avaliacao_updated_at
  BEFORE UPDATE ON usuario_livro_avaliacao
  FOR EACH ROW
  EXECUTE FUNCTION update_usuario_livro_avaliacao_updated_at();
