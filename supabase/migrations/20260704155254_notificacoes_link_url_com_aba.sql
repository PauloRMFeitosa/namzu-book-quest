-- Função: anexa ?aba= ao link_url de notificações de clube conforme o tipo
CREATE OR REPLACE FUNCTION public.fn_notificacao_definir_aba()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_aba text;
BEGIN
  -- Só age em links de clube que ainda não têm query string
  IF NEW.link_url IS NULL
     OR NEW.link_url NOT LIKE '/clubes/%'
     OR NEW.link_url LIKE '%?%' THEN
    RETURN NEW;
  END IF;

  v_aba := CASE NEW.tipo
    WHEN 'clube_novo_livro_trilha' THEN 'trilha'
    WHEN 'clube_novo_membro'       THEN 'membros'
    WHEN 'clube_novo_post'         THEN 'feed'
    WHEN 'clube_curtida_post'      THEN 'feed'
    WHEN 'clube_novo_comentario'   THEN 'feed'
    ELSE NULL
  END;

  IF v_aba IS NOT NULL THEN
    NEW.link_url := NEW.link_url || '?aba=' || v_aba;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificacao_definir_aba ON public.notificacoes;
CREATE TRIGGER trg_notificacao_definir_aba
  BEFORE INSERT ON public.notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notificacao_definir_aba();

-- Correção retroativa das notificações existentes
UPDATE public.notificacoes
SET link_url = link_url || '?aba=' ||
  CASE tipo
    WHEN 'clube_novo_livro_trilha' THEN 'trilha'
    WHEN 'clube_novo_membro'       THEN 'membros'
    ELSE 'feed'
  END
WHERE link_url LIKE '/clubes/%'
  AND link_url NOT LIKE '%?%'
  AND tipo IN ('clube_novo_livro_trilha','clube_novo_membro','clube_novo_post','clube_curtida_post','clube_novo_comentario');
