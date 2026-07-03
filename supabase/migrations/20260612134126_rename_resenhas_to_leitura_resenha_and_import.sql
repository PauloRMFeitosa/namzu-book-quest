
-- 1. Remove tabela criada com nome errado
DROP TABLE IF EXISTS public.resenhas CASCADE;

-- 2. Cria leitura_resenha
CREATE TABLE IF NOT EXISTS public.leitura_resenha (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id      uuid        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  leitura_id   uuid        REFERENCES public.leituras(id) ON DELETE SET NULL,
  titulo       text,
  texto        text        NOT NULL,
  nota         smallint    CHECK (nota BETWEEN 1 AND 5),
  tem_spoiler  boolean     NOT NULL DEFAULT false,
  visibilidade text        NOT NULL DEFAULT 'publica'
                           CHECK (visibilidade IN ('privada', 'clube', 'publica')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, obra_id)
);

ALTER TABLE public.leitura_resenha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura_resenha_select"
  ON public.leitura_resenha FOR SELECT
  USING (visibilidade = 'publica' OR auth.uid() = user_id);

CREATE POLICY "leitura_resenha_insert"
  ON public.leitura_resenha FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leitura_resenha_update"
  ON public.leitura_resenha FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leitura_resenha_delete"
  ON public.leitura_resenha FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_leitura_resenha_updated_at
  BEFORE UPDATE ON public.leitura_resenha
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 3. Importa resenhas já preenchidas no leitura_pos
INSERT INTO public.leitura_resenha (user_id, obra_id, leitura_id, texto, tem_spoiler, visibilidade)
SELECT
  l.user_id,
  ulv.obra_id,
  lp.leitura_id,
  lp.resenha,
  COALESCE(lp.tem_spoiler, false),
  CASE WHEN lp.publica THEN 'publica' ELSE 'privada' END
FROM public.leitura_pos lp
JOIN public.leituras       l   ON l.id   = lp.leitura_id
JOIN public.usuario_leituras ul ON ul.id  = l.usuario_leitura_id
JOIN public.usuario_livros ulv  ON ulv.id = ul.usuario_livro_id
WHERE lp.resenha IS NOT NULL
  AND trim(lp.resenha) != ''
ON CONFLICT (user_id, obra_id) DO NOTHING;
