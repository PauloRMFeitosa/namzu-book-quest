
CREATE TABLE usuario_livro_avaliacao (
  usuario_livro_id      uuid                    NOT NULL,
  status                status_avaliacao_tipo   NOT NULL DEFAULT 'PENDENTE',
  dispensado_em         timestamptz,
  notificacao_enviada   boolean                 NOT NULL DEFAULT false,
  notificacao_enviada_em timestamptz,
  created_at            timestamptz             NOT NULL DEFAULT now(),
  updated_at            timestamptz             NOT NULL DEFAULT now(),

  CONSTRAINT usuario_livro_avaliacao_pkey
    PRIMARY KEY (usuario_livro_id),

  CONSTRAINT usuario_livro_avaliacao_usuario_livro_id_fkey
    FOREIGN KEY (usuario_livro_id)
    REFERENCES usuario_livros (id)
    ON DELETE CASCADE
);

COMMENT ON TABLE usuario_livro_avaliacao IS
  'Rastreia o estado do fluxo de incentivo à avaliação pós-leitura. Uma linha é criada quando o livro é marcado como lido. Ausência de linha = NAO_APLICAVEL (livro não concluído).';

COMMENT ON COLUMN usuario_livro_avaliacao.status IS
  'Estado atual: PENDENTE | AVALIADO | DISPENSADO_TEMPORARIO | DISPENSADO_DEFINITIVO';

COMMENT ON COLUMN usuario_livro_avaliacao.dispensado_em IS
  'Preenchido ao escolher "Lembrar mais tarde". Base para o cooldown de 7 dias antes de reaparecer na Home.';

COMMENT ON COLUMN usuario_livro_avaliacao.notificacao_enviada IS
  'Flag para controle do disparo da notificação 48h após conclusão.';
