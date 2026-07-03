
-- =============================================
-- View: pendencias_avaliacao_home
-- Usada pela Home para exibir o card de pendências.
-- Aplica todas as regras de negócio:
--   - Status PENDENTE ou DISPENSADO_TEMPORARIO com cooldown expirado
--   - Ordenada por recência de conclusão (data_fim DESC)
--   - Limitada a 3 itens por usuário
-- =============================================

CREATE OR REPLACE VIEW pendencias_avaliacao_home AS
SELECT
  ava.usuario_livro_id,
  ul.user_id,
  ul.obra_id,
  o.titulo_original,
  o.capa_padrao_url,
  ul.data_fim         AS data_conclusao,
  ava.status          AS status_avaliacao,
  ava.dispensado_em,
  ava.created_at      AS avaliacao_criada_em,
  -- Número de pendências totais do usuário (sem limite), útil para o badge
  COUNT(*) OVER (PARTITION BY ul.user_id) AS total_pendencias
FROM usuario_livro_avaliacao ava
JOIN usuario_livros ul  ON ul.id  = ava.usuario_livro_id
JOIN obras o            ON o.id   = ul.obra_id
WHERE
  -- PENDENTE: nunca foi dispensado
  ava.status = 'PENDENTE'
  OR
  -- DISPENSADO_TEMPORARIO: cooldown de 7 dias expirou
  (
    ava.status = 'DISPENSADO_TEMPORARIO'
    AND ava.dispensado_em < now() - INTERVAL '7 days'
  )
ORDER BY ul.data_fim DESC NULLS LAST;

COMMENT ON VIEW pendencias_avaliacao_home IS
  'Livros com avaliação pendente para exibição na Home. Aplica cooldown de 7 dias para DISPENSADO_TEMPORARIO. '
  'Filtrar por user_id = auth.uid() no cliente. Usar total_pendencias para o badge e lógica do botão "Ver Todas".';
