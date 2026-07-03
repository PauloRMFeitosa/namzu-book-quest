
-- 1. Adicionar coluna tipo em clube_posts para distinguir posts automáticos
ALTER TABLE public.clube_posts
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'manual'
  CHECK (tipo = ANY (ARRAY['manual', 'sistema_livro_trilha']));

-- 2. Atualizar a função já existente adicionando o INSERT no feed
CREATE OR REPLACE FUNCTION public.fn_notificar_novo_livro_trilha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clube_nome    TEXT;
  v_clube_curador UUID;
  v_obra_titulo   TEXT;
  v_membro        RECORD;
  v_conteudo_feed TEXT;
  v_data_trecho   TEXT;
BEGIN
  -- Dados do clube
  SELECT nome, curador_id
    INTO v_clube_nome, v_clube_curador
  FROM public.clubes
  WHERE id = NEW.clube_id;

  -- Título da obra
  SELECT titulo_original
    INTO v_obra_titulo
  FROM public.obras
  WHERE id = NEW.obra_id;

  -- ── Montar trecho de datas (só se existirem) ──────────────────────────
  v_data_trecho := '';

  IF NEW.data_inicio_sugerida IS NOT NULL AND NEW.data_fim_sugerida IS NOT NULL THEN
    v_data_trecho :=
      E'\n\n📅 Período de leitura: '
      || TO_CHAR(NEW.data_inicio_sugerida, 'DD/MM/YYYY')
      || ' até '
      || TO_CHAR(NEW.data_fim_sugerida,   'DD/MM/YYYY');
  ELSIF NEW.data_inicio_sugerida IS NOT NULL THEN
    v_data_trecho :=
      E'\n\n📅 Início sugerido: '
      || TO_CHAR(NEW.data_inicio_sugerida, 'DD/MM/YYYY');
  ELSIF NEW.data_fim_sugerida IS NOT NULL THEN
    v_data_trecho :=
      E'\n\n📅 Prazo sugerido: '
      || TO_CHAR(NEW.data_fim_sugerida, 'DD/MM/YYYY');
  END IF;

  -- ── Conteúdo do post de feed ──────────────────────────────────────────
  v_conteudo_feed :=
    '📚 Novo livro na trilha!'
    || E'\n\n'
    || '"' || COALESCE(v_obra_titulo, 'Obra sem título') || '" acaba de ser adicionado à trilha de leitura do clube.'
    || v_data_trecho
    || E'\n\nBora lá? Registre suas impressões aqui no feed conforme for avançando na leitura. 🙌';

  -- ── Post no feed do clube ─────────────────────────────────────────────
  INSERT INTO public.clube_posts (
    clube_id,
    user_id,
    obra_id,
    conteudo,
    tipo,
    is_destaque_curador
  ) VALUES (
    NEW.clube_id,
    v_clube_curador,
    NEW.obra_id,
    v_conteudo_feed,
    'sistema_livro_trilha',
    false
  );

  -- ── Notificações para membros ativos ─────────────────────────────────
  FOR v_membro IN
    SELECT user_id
    FROM public.clube_membros
    WHERE clube_id = NEW.clube_id
      AND status   = 'ativo'
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
