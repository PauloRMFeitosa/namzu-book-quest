-- Corrige o trigger: o front usa ?tab= com valores feed|leituras|membros
CREATE OR REPLACE FUNCTION public.fn_notificacao_definir_aba()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tab text;
BEGIN
  IF NEW.link_url IS NULL
     OR NEW.link_url NOT LIKE '/clubes/%'
     OR NEW.link_url LIKE '%?%' THEN
    RETURN NEW;
  END IF;

  v_tab := CASE NEW.tipo
    WHEN 'clube_novo_livro_trilha' THEN 'leituras'
    WHEN 'clube_novo_membro'       THEN 'membros'
    WHEN 'clube_novo_post'         THEN 'feed'
    WHEN 'clube_curtida_post'      THEN 'feed'
    WHEN 'clube_novo_comentario'   THEN 'feed'
    WHEN 'clube_novo_evento'       THEN 'eventos'
    WHEN 'clube_novo_conteudo'     THEN 'conteudos'
    ELSE NULL
  END;

  IF v_tab IS NOT NULL THEN
    NEW.link_url := NEW.link_url || '?tab=' || v_tab;
  END IF;

  RETURN NEW;
END;
$$;

-- Corrige as linhas que ganharam ?aba= na migração anterior
UPDATE public.notificacoes
SET link_url = replace(replace(replace(link_url,
  '?aba=trilha',  '?tab=leituras'),
  '?aba=membros', '?tab=membros'),
  '?aba=feed',    '?tab=feed')
WHERE link_url LIKE '%?aba=%';
