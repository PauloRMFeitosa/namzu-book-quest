
-- O constraint antigo lista valores que nunca foram usados pelos triggers.
-- Os triggers reais usam: 'insight_registrado', 'livro_concluido',
-- 'conquista_<codigo>' (dinâmico via desbloquear_conquista).
-- Como acao é controlado exclusivamente por funções server-side,
-- removemos o CHECK restritivo e substituímos por NOT NULL apenas.

ALTER TABLE gamificacao_xp_log
  DROP CONSTRAINT IF EXISTS gamificacao_xp_log_acao_check;

ALTER TABLE gamificacao_xp_log
  ALTER COLUMN acao SET NOT NULL;
