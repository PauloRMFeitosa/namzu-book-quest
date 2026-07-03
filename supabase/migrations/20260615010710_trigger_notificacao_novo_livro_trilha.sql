
-- 1. Adicionar novo tipo ao CHECK constraint
ALTER TABLE notificacoes
  DROP CONSTRAINT notificacoes_tipo_check;

ALTER TABLE notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'novo_conteudo',
    'novo_comentario',
    'missao',
    'streak_risco',
    'conquista',
    'ranking',
    'avaliacao_pendente',
    'clube_novo_membro',
    'clube_curtida_post',
    'clube_novo_evento',
    'clube_novo_post',
    'clube_novo_comentario',
    'clube_novo_livro_trilha'   -- novo tipo
  ]));

-- 2. Função do trigger
CREATE OR REPLACE FUNCTION public.fn_notificar_novo_livro_trilha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clube_nome  TEXT;
  v_obra_titulo TEXT;
  v_membro      RECORD;
BEGIN
  -- Buscar nome do clube
  SELECT nome INTO v_clube_nome
  FROM public.clubes
  WHERE id = NEW.clube_id;

  -- Buscar título da obra
  SELECT titulo_original INTO v_obra_titulo
  FROM public.obras
  WHERE id = NEW.obra_id;

  -- Inserir notificação para cada membro ativo do clube
  FOR v_membro IN
    SELECT cm.user_id
    FROM public.clube_membros cm
    WHERE cm.clube_id = NEW.clube_id
      AND cm.status   = 'ativo'
  LOOP
    INSERT INTO public.notificacoes (
      user_id,
      tipo,
      titulo,
      mensagem,
      referencia_id,
      link_url
    ) VALUES (
      v_membro.user_id,
      'clube_novo_livro_trilha',
      'Novo livro na trilha do clube',
      'O livro "' || COALESCE(v_obra_titulo, 'sem título') || '" foi adicionado à trilha de leitura do clube "' || COALESCE(v_clube_nome, 'sem nome') || '".',
      NEW.clube_id,
      '/clubes/' || NEW.clube_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Trigger em clube_trilhas
CREATE TRIGGER trg_notificar_novo_livro_trilha
  AFTER INSERT ON public.clube_trilhas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notificar_novo_livro_trilha();
