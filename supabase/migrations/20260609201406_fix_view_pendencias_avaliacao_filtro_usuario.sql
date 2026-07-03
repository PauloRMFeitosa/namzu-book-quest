
CREATE OR REPLACE VIEW pendencias_avaliacao_home
WITH (security_invoker = on)
AS
SELECT
  ava.usuario_livro_id,
  ul.user_id,
  ul.obra_id,
  o.titulo_original,
  o.capa_padrao_url,
  ul.data_fim          AS data_conclusao,
  ava.status           AS status_avaliacao,
  ava.dispensado_em,
  ava.created_at       AS avaliacao_criada_em,
  COUNT(*) OVER (PARTITION BY ul.user_id) AS total_pendencias
FROM usuario_livro_avaliacao ava
JOIN usuario_livros ul ON ul.id = ava.usuario_livro_id
JOIN obras o           ON o.id  = ul.obra_id
WHERE
  ul.user_id = auth.uid()
  AND (
    ava.status = 'PENDENTE'
    OR (
      ava.status = 'DISPENSADO_TEMPORARIO'
      AND ava.dispensado_em < now() - INTERVAL '7 days'
    )
  )
ORDER BY ul.data_fim DESC NULLS LAST;
