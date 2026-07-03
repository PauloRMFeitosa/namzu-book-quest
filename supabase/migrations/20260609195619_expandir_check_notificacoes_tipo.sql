
ALTER TABLE notificacoes
  DROP CONSTRAINT notificacoes_tipo_check;

ALTER TABLE notificacoes
  ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo = ANY (ARRAY[
    'novo_conteudo'::text,
    'novo_comentario'::text,
    'missao'::text,
    'streak_risco'::text,
    'conquista'::text,
    'ranking'::text,
    'avaliacao_pendente'::text,
    'clube_novo_membro'::text,
    'clube_curtida_post'::text,
    'clube_novo_evento'::text
  ]));
