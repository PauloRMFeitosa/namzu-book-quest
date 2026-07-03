-- Adiciona clubes.updated_at (consultada pela home, mas inexistente até agora)
ALTER TABLE public.clubes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill: usa created_at como valor inicial quando disponível
UPDATE public.clubes
SET updated_at = COALESCE(created_at, now());

-- Trigger para manter atualizado automaticamente
DROP TRIGGER IF EXISTS trg_clubes_updated_at ON public.clubes;
CREATE TRIGGER trg_clubes_updated_at
  BEFORE UPDATE ON public.clubes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
