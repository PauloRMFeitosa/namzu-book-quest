
-- ═══════════════════════════════════════════════════════════════
-- PASSO 4A: edicao_id vira NOT NULL
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.usuario_livros
  ALTER COLUMN edicao_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- PASSO 4B: Trigger que mantém obra_id sincronizado com edicoes.obra_id
--            → dispara em INSERT e UPDATE de edicao_id
--            → assim o frontend continua lendo obra_id normalmente
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_sync_obra_id_from_edicao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só recalcula quando edicao_id for definido ou alterado
  IF NEW.edicao_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.edicao_id IS DISTINCT FROM OLD.edicao_id) THEN
    SELECT e.obra_id
      INTO NEW.obra_id
      FROM public.edicoes e
     WHERE e.id = NEW.edicao_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_obra_id_from_edicao
  BEFORE INSERT OR UPDATE OF edicao_id
  ON public.usuario_livros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_obra_id_from_edicao();

-- ═══════════════════════════════════════════════════════════════
-- PASSO 4C: Garantir que obra_id está correto em todos os registros
--            (re-sync a partir do edicao_id já populado)
-- ═══════════════════════════════════════════════════════════════
UPDATE public.usuario_livros ul
SET obra_id = e.obra_id
FROM public.edicoes e
WHERE e.id = ul.edicao_id
AND (ul.obra_id IS DISTINCT FROM e.obra_id OR ul.obra_id IS NULL);
