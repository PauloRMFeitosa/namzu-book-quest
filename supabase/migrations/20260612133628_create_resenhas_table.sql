
CREATE TABLE IF NOT EXISTS public.resenhas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id     uuid        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  leitura_id  uuid        REFERENCES public.leituras(id) ON DELETE SET NULL,
  titulo      text,
  texto       text        NOT NULL,
  nota        smallint    CHECK (nota BETWEEN 1 AND 5),
  tem_spoiler boolean     NOT NULL DEFAULT false,
  visibilidade text       NOT NULL DEFAULT 'publica'
                          CHECK (visibilidade IN ('privada', 'clube', 'publica')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, obra_id)
);

ALTER TABLE public.resenhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resenhas_select"
  ON public.resenhas FOR SELECT
  USING (visibilidade = 'publica' OR auth.uid() = user_id);

CREATE POLICY "resenhas_insert"
  ON public.resenhas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "resenhas_update"
  ON public.resenhas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "resenhas_delete"
  ON public.resenhas FOR DELETE
  USING (auth.uid() = user_id);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_resenhas_updated_at
  BEFORE UPDATE ON public.resenhas
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
