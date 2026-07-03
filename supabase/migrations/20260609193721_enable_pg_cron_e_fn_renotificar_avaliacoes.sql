
-- Habilita pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Garante que o schema cron é acessível
GRANT USAGE ON SCHEMA cron TO postgres;

/**
 * Função chamada periodicamente para re-notificar usuários que dispensaram
 * a avaliação temporariamente há mais de 48 horas.
 *
 * O que faz:
 *  1. Insere nova notificação para cada avaliação DISPENSADO_TEMPORARIO
 *     com dispensado_em >= 48h atrás e sem notificação não lida ativa.
 *  2. Reseta o status de volta para PENDENTE e limpa dispensado_em.
 */
CREATE OR REPLACE FUNCTION fn_renotificar_avaliacoes_dispensadas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Insere nova notificação somente se não existir uma não lida já
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  SELECT
    ul.user_id,
    'avaliacao_pendente',
    'Como foi ' || COALESCE(o.titulo_original, 'o livro') || '?',
    'Você pediu para ser lembrado. Que tal avaliar agora?',
    '/notificacoes',
    ula.usuario_livro_id
  FROM usuario_livro_avaliacao ula
  JOIN usuario_livros ul ON ul.id = ula.usuario_livro_id
  JOIN obras o ON o.id = ul.obra_id
  WHERE ula.status = 'DISPENSADO_TEMPORARIO'
    AND ula.dispensado_em < now() - INTERVAL '48 hours'
    AND NOT EXISTS (
      SELECT 1 FROM notificacoes n
      WHERE n.referencia_id = ula.usuario_livro_id
        AND n.tipo = 'avaliacao_pendente'
        AND n.lida = false
    );

  -- 2. Reseta status para PENDENTE e limpa dispensado_em
  UPDATE usuario_livro_avaliacao
  SET
    status = 'PENDENTE',
    dispensado_em = NULL
  WHERE status = 'DISPENSADO_TEMPORARIO'
    AND dispensado_em < now() - INTERVAL '48 hours';
END;
$$;
