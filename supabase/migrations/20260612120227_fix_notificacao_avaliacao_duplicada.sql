
-- Corrige a função para só disparar quando status muda PARA concluido/lido
CREATE OR REPLACE FUNCTION trg_fn_criar_avaliacao_livro()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_titulo text;
BEGIN
  -- Só processa quando status muda PARA concluido/lido
  IF NEW.status NOT IN ('concluido', 'lido') THEN
    RETURN NEW;
  END IF;
  -- Em UPDATE, ignora se já estava concluido/lido
  IF TG_OP = 'UPDATE' AND OLD.status IN ('concluido', 'lido') THEN
    RETURN NEW;
  END IF;

  -- Busca título da obra
  SELECT o.titulo_original INTO v_titulo
  FROM obras o
  WHERE o.id = NEW.obra_id
  LIMIT 1;

  -- Cria registro de avaliação pendente (idempotente)
  INSERT INTO usuario_livro_avaliacao (usuario_livro_id)
  VALUES (NEW.id)
  ON CONFLICT (usuario_livro_id) DO NOTHING;

  -- Cria notificação (uma por livro, não duplica se já existe não-lida)
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  SELECT
    NEW.user_id,
    'avaliacao_pendente',
    'Como foi ' || COALESCE(v_titulo, 'o livro') || '?',
    'Você concluiu a leitura. Que tal deixar uma avaliação?',
    '/notificacoes',
    NEW.id
  WHERE NOT EXISTS (
    SELECT 1 FROM notificacoes
    WHERE user_id      = NEW.user_id
      AND tipo         = 'avaliacao_pendente'
      AND referencia_id = NEW.id
      AND lida         = false
  );

  RETURN NEW;
END;
$$;
