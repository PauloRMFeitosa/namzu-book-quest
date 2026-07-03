
ALTER TABLE notificacoes
  ADD COLUMN IF NOT EXISTS referencia_id uuid;

CREATE INDEX IF NOT EXISTS idx_notificacoes_referencia_id
  ON notificacoes (referencia_id)
  WHERE referencia_id IS NOT NULL;
