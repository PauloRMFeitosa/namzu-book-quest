
-- Trigger: marcar notificação como lida quando o livro for avaliado
CREATE OR REPLACE FUNCTION trg_fn_marcar_avaliado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualiza status de avaliação
  UPDATE usuario_livro_avaliacao
  SET status = 'AVALIADO'
  WHERE usuario_livro_id = NEW.id
    AND status IN ('PENDENTE', 'DISPENSADO_TEMPORARIO');

  -- Marca notificação como lida
  UPDATE notificacoes
  SET lida = true
  WHERE referencia_id = NEW.id
    AND tipo = 'avaliacao_pendente'
    AND lida = false;

  RETURN NEW;
END;
$$;

-- RPC: dispensar avaliação e marcar notificação como lida
CREATE OR REPLACE FUNCTION dispensar_avaliacao(
  p_usuario_livro_id uuid,
  p_definitivo boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica ownership
  IF NOT EXISTS (
    SELECT 1 FROM usuario_livros
    WHERE id = p_usuario_livro_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Atualiza status de avaliação
  UPDATE usuario_livro_avaliacao
  SET
    status = CASE WHEN p_definitivo THEN 'DISPENSADO_DEFINITIVO' ELSE 'DISPENSADO_TEMPORARIO' END,
    dispensado_em = now()
  WHERE usuario_livro_id = p_usuario_livro_id
    AND status IN ('PENDENTE', 'DISPENSADO_TEMPORARIO');

  -- Marca notificação como lida
  UPDATE notificacoes
  SET lida = true
  WHERE referencia_id = p_usuario_livro_id
    AND tipo = 'avaliacao_pendente'
    AND lida = false;
END;
$$;
