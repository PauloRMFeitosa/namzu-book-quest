
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matches_intelectuais_user_a_user_b_key'
  ) THEN
    ALTER TABLE matches_intelectuais
      ADD CONSTRAINT matches_intelectuais_user_a_user_b_key UNIQUE (user_a, user_b);
  END IF;
END $$;
