-- Adiciona os tipos clube_novo_post e clube_novo_comentario à constraint CHECK
-- de notificacoes.tipo. Esses valores são usados pelos triggers
-- notify_novo_post_feed e notify_novo_comentario em clube_posts.
ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_tipo_check;

ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (
  tipo = ANY (ARRAY[
    'novo_conteudo',
    'novo_comentario',
    'missao',
    'streak_risco',
    'conquista',
    'ranking',
    'avaliacao_pendente',
    'clube_novo_membro',
    'clube_curtida_post',
    'clube_novo_evento',
    'clube_novo_post',
    'clube_novo_comentario'
  ])
);
