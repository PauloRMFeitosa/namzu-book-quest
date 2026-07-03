
CREATE OR REPLACE FUNCTION trg_fn_criar_avaliacao_livro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_titulo text;
BEGIN
  -- Busca o título da obra para a notificação
  SELECT o.titulo_original INTO v_titulo
  FROM obras o
  JOIN usuario_livros ul ON ul.obra_id = o.id
  WHERE ul.id = NEW.id
  LIMIT 1;

  -- Cria o registro de avaliação pendente
  INSERT INTO usuario_livro_avaliacao (usuario_livro_id)
  VALUES (NEW.id)
  ON CONFLICT (usuario_livro_id) DO NOTHING;

  -- Cria notificação na tabela central
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  VALUES (
    NEW.user_id,
    'avaliacao_pendente',
    'Como foi ' || COALESCE(v_titulo, 'o livro') || '?',
    'Você concluiu a leitura. Que tal deixar uma avaliação?',
    '/notificacoes',
    NEW.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
