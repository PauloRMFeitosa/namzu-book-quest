
-- Trigger de compatibilidade: se INSERT vier sem edicao_id mas com obra_id,
-- auto-preenche com a melhor edição disponível (preferência: com num_paginas, depois mais antiga)
CREATE OR REPLACE FUNCTION public.fn_auto_edicao_id_from_obra()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.edicao_id IS NULL AND NEW.obra_id IS NOT NULL THEN
    SELECT id
      INTO NEW.edicao_id
      FROM public.edicoes
     WHERE obra_id = NEW.obra_id
     ORDER BY
       CASE WHEN num_paginas IS NOT NULL THEN 0 ELSE 1 END,
       created_at ASC
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_edicao_id_from_obra
  BEFORE INSERT ON public.usuario_livros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_edicao_id_from_obra();
