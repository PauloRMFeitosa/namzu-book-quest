
-- ─────────────────────────────────────────────
-- 1. NOVO MEMBRO → notifica o curador do clube
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_notif_clube_novo_membro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clube_nome  text;
  v_curador_id  uuid;
  v_membro_nome text;
BEGIN
  SELECT nome, curador_id INTO v_clube_nome, v_curador_id
  FROM clubes WHERE id = NEW.clube_id;

  -- Não notifica se o entrante é o próprio curador
  IF NEW.user_id = v_curador_id THEN RETURN NEW; END IF;

  SELECT COALESCE(nome_exibicao, username, 'Alguém') INTO v_membro_nome
  FROM perfis WHERE user_id = NEW.user_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  VALUES (
    v_curador_id,
    'clube_novo_membro',
    'Novo membro em ' || COALESCE(v_clube_nome, 'seu clube'),
    COALESCE(v_membro_nome, 'Alguém') || ' entrou no clube.',
    '/clubes/' || NEW.clube_id,
    NEW.clube_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_clube_novo_membro ON clube_membros;
CREATE TRIGGER trg_notif_clube_novo_membro
  AFTER INSERT ON clube_membros
  FOR EACH ROW EXECUTE FUNCTION trg_fn_notif_clube_novo_membro();


-- ─────────────────────────────────────────────
-- 2. CURTIDA NO POST → notifica o autor
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_notif_clube_curtida_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_post_autor_id   uuid;
  v_clube_id        uuid;
  v_quem_curtiu     text;
BEGIN
  SELECT user_id, clube_id INTO v_post_autor_id, v_clube_id
  FROM clube_posts WHERE id = NEW.post_id;

  -- Sem notificação para auto-curtida
  IF NEW.user_id = v_post_autor_id THEN RETURN NEW; END IF;

  SELECT COALESCE(nome_exibicao, username, 'Alguém') INTO v_quem_curtiu
  FROM perfis WHERE user_id = NEW.user_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  VALUES (
    v_post_autor_id,
    'clube_curtida_post',
    'Curtida na sua publicação',
    COALESCE(v_quem_curtiu, 'Alguém') || ' curtiu sua publicação no clube.',
    '/clubes/' || v_clube_id,
    NEW.post_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_clube_curtida_post ON clube_post_curtidas;
CREATE TRIGGER trg_notif_clube_curtida_post
  AFTER INSERT ON clube_post_curtidas
  FOR EACH ROW EXECUTE FUNCTION trg_fn_notif_clube_curtida_post();


-- ─────────────────────────────────────────────
-- 3. NOVO EVENTO → notifica todos os membros ativos (exceto criador)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_notif_clube_novo_evento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clube_nome text;
BEGIN
  SELECT nome INTO v_clube_nome FROM clubes WHERE id = NEW.clube_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, link_url, referencia_id)
  SELECT
    cm.user_id,
    'clube_novo_evento',
    'Novo evento: ' || NEW.titulo,
    'O clube ' || COALESCE(v_clube_nome, 'seu clube') || ' tem um novo evento agendado.',
    '/clubes/' || NEW.clube_id,
    NEW.id
  FROM clube_membros cm
  WHERE cm.clube_id = NEW.clube_id
    AND cm.status   = 'ativo'
    AND cm.user_id <> NEW.criador_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_clube_novo_evento ON eventos;
CREATE TRIGGER trg_notif_clube_novo_evento
  AFTER INSERT ON eventos
  FOR EACH ROW EXECUTE FUNCTION trg_fn_notif_clube_novo_evento();
