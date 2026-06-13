-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers de geração automática de notificações
-- Cobre os 5 eventos disponíveis (clube_eventos ainda não existe):
--   1. Novo comentário num post  → notifica autor do post
--   2. Novo post no feed         → notifica todos os membros ativos
--   3. Novo conteúdo publicado   → notifica todos os membros ativos
--   4. Novo membro no clube      → notifica o curador
--   5. Post curtido              → notifica autor do post
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Novo comentário ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_novo_comentario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_post_autor  uuid;
  v_clube_id    uuid;
  v_autor_nome  text;
  v_clube_nome  text;
BEGIN
  IF NEW.parent_post_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id, clube_id INTO v_post_autor, v_clube_id
  FROM clube_posts WHERE id = NEW.parent_post_id;

  IF v_post_autor IS NULL OR v_post_autor = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(nome_exibicao, username, 'Alguém') INTO v_autor_nome
  FROM perfis WHERE user_id = NEW.user_id;

  SELECT nome INTO v_clube_nome FROM clubes WHERE id = v_clube_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  VALUES (
    v_post_autor,
    'clube_novo_comentario',
    'Novo comentário no seu post',
    COALESCE(v_autor_nome, 'Alguém') || ' comentou no seu post em ' || COALESCE(v_clube_nome, 'um clube'),
    '/clubes/' || v_clube_id::text,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_novo_comentario ON clube_posts;
CREATE TRIGGER trg_notify_novo_comentario
  AFTER INSERT ON clube_posts
  FOR EACH ROW EXECUTE FUNCTION notify_novo_comentario();

-- ── 2. Novo post no feed (notifica todos os membros ativos) ───────────────────
CREATE OR REPLACE FUNCTION notify_novo_post_feed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_autor_nome text;
  v_clube_nome text;
BEGIN
  IF NEW.parent_post_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(nome_exibicao, username, 'Alguém') INTO v_autor_nome
  FROM perfis WHERE user_id = NEW.user_id;

  SELECT nome INTO v_clube_nome FROM clubes WHERE id = NEW.clube_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  SELECT
    m.user_id,
    'clube_novo_post',
    'Novo post no clube',
    COALESCE(v_autor_nome, 'Alguém') || ' publicou algo em ' || COALESCE(v_clube_nome, 'seu clube'),
    '/clubes/' || NEW.clube_id::text,
    NEW.id
  FROM clube_membros m
  WHERE m.clube_id = NEW.clube_id
    AND m.status = 'ativo'
    AND m.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_novo_post_feed ON clube_posts;
CREATE TRIGGER trg_notify_novo_post_feed
  AFTER INSERT ON clube_posts
  FOR EACH ROW EXECUTE FUNCTION notify_novo_post_feed();

-- ── 3. Novo conteúdo publicado (notifica todos os membros ativos) ─────────────
CREATE OR REPLACE FUNCTION notify_novo_conteudo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clube_nome text;
BEGIN
  SELECT nome INTO v_clube_nome FROM clubes WHERE id = NEW.clube_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  SELECT
    m.user_id,
    'clube_novo_conteudo',
    'Novo conteúdo disponível',
    'Nova publicação em ' || COALESCE(v_clube_nome, 'seu clube') || ': ' || NEW.titulo,
    '/clubes/' || NEW.clube_id::text,
    NEW.id
  FROM clube_membros m
  WHERE m.clube_id = NEW.clube_id
    AND m.status = 'ativo';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_novo_conteudo ON clube_conteudos;
CREATE TRIGGER trg_notify_novo_conteudo
  AFTER INSERT ON clube_conteudos
  FOR EACH ROW EXECUTE FUNCTION notify_novo_conteudo();

-- ── 4. Novo membro → notifica curador ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_novo_membro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_curador_id uuid;
  v_clube_nome text;
  v_membro_nome text;
BEGIN
  SELECT curador_id, nome INTO v_curador_id, v_clube_nome
  FROM clubes WHERE id = NEW.clube_id;

  IF v_curador_id IS NULL OR v_curador_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(nome_exibicao, username, 'Alguém') INTO v_membro_nome
  FROM perfis WHERE user_id = NEW.user_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  VALUES (
    v_curador_id,
    'clube_novo_membro',
    'Novo membro no clube',
    COALESCE(v_membro_nome, 'Alguém') || ' entrou em ' || COALESCE(v_clube_nome, 'seu clube'),
    '/clubes/' || NEW.clube_id::text,
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_novo_membro ON clube_membros;
CREATE TRIGGER trg_notify_novo_membro
  AFTER INSERT ON clube_membros
  FOR EACH ROW EXECUTE FUNCTION notify_novo_membro();

-- ── 5. Post curtido → notifica autor ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_curtida_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_post_autor   uuid;
  v_clube_id     uuid;
  v_curtidor_nome text;
  v_clube_nome   text;
BEGIN
  SELECT user_id, clube_id INTO v_post_autor, v_clube_id
  FROM clube_posts WHERE id = NEW.post_id;

  IF v_post_autor IS NULL OR v_post_autor = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(nome_exibicao, username, 'Alguém') INTO v_curtidor_nome
  FROM perfis WHERE user_id = NEW.user_id;

  SELECT nome INTO v_clube_nome FROM clubes WHERE id = v_clube_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  VALUES (
    v_post_autor,
    'clube_curtida_post',
    'Seu post foi curtido',
    COALESCE(v_curtidor_nome, 'Alguém') || ' curtiu seu post em ' || COALESCE(v_clube_nome, 'um clube'),
    '/clubes/' || v_clube_id::text,
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_curtida_post ON clube_post_curtidas;
CREATE TRIGGER trg_notify_curtida_post
  AFTER INSERT ON clube_post_curtidas
  FOR EACH ROW EXECUTE FUNCTION notify_curtida_post();

-- ── 6. Novo evento → será adicionado quando a tabela clube_eventos existir ────
