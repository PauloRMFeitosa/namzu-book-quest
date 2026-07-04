-- 1) desbloquear_conquista vira idempotente de verdade: se a conquista já
--    foi desbloqueada, não repete XP nem notificação. (Antes, o trigger de
--    streak reenviava a notificação a cada ganho de XP com streak >= marco.)
--    Também corrige o tipo da notificação: 'conquista_desbloqueada' viola a
--    notificacoes_tipo_check atual — o tipo permitido é 'conquista'.
CREATE OR REPLACE FUNCTION public.desbloquear_conquista(p_user_id uuid, p_codigo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_conquista conquistas%ROWTYPE;
BEGIN
  SELECT * INTO v_conquista FROM conquistas WHERE codigo = p_codigo;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO usuario_conquistas (user_id, conquista_id, desbloqueado_em)
  VALUES (p_user_id, v_conquista.id, now())
  ON CONFLICT DO NOTHING;
  -- já estava desbloqueada: nada a fazer
  IF NOT FOUND THEN RETURN; END IF;

  IF v_conquista.xp_recompensa > 0 THEN
    PERFORM conceder_xp(p_user_id, v_conquista.xp_recompensa, 'conquista_' || p_codigo, v_conquista.id);
  END IF;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, referencia_id)
  VALUES (
    p_user_id,
    'conquista',
    '🏆 ' || v_conquista.nome,
    'Você desbloqueou a conquista "' || v_conquista.nome || '" e ganhou ' || v_conquista.xp_recompensa || ' XP!',
    v_conquista.id
  );
END;
$fn$;

-- 2) comunidade_1: participar do primeiro clube
CREATE OR REPLACE FUNCTION public.trg_conquista_comunidade_membro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.status = 'ativo' THEN
    PERFORM desbloquear_conquista(NEW.user_id, 'comunidade_1');
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_conquista_comunidade_membro ON public.clube_membros;
CREATE TRIGGER trg_conquista_comunidade_membro
  AFTER INSERT OR UPDATE OF status ON public.clube_membros
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_conquista_comunidade_membro();

-- 3) comunidade_50: 50 publicações em clubes
CREATE OR REPLACE FUNCTION public.trg_conquista_comunidade_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_total integer;
BEGIN
  SELECT count(*) INTO v_total FROM clube_posts WHERE user_id = NEW.user_id;
  IF v_total >= 50 THEN
    PERFORM desbloquear_conquista(NEW.user_id, 'comunidade_50');
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_conquista_comunidade_posts ON public.clube_posts;
CREATE TRIGGER trg_conquista_comunidade_posts
  AFTER INSERT ON public.clube_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_conquista_comunidade_posts();

-- 4) comunidade_500: 500 curtidas recebidas nas próprias publicações
CREATE OR REPLACE FUNCTION public.trg_conquista_comunidade_curtidas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_autor uuid;
  v_total integer;
BEGIN
  SELECT user_id INTO v_autor FROM clube_posts WHERE id = NEW.post_id;
  IF v_autor IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_total
  FROM clube_post_curtidas c
  JOIN clube_posts p ON p.id = c.post_id
  WHERE p.user_id = v_autor;

  IF v_total >= 500 THEN
    PERFORM desbloquear_conquista(v_autor, 'comunidade_500');
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_conquista_comunidade_curtidas ON public.clube_post_curtidas;
CREATE TRIGGER trg_conquista_comunidade_curtidas
  AFTER INSERT ON public.clube_post_curtidas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_conquista_comunidade_curtidas();

-- 5) Retroativo: quem já cumpre os critérios hoje recebe a conquista
DO $do$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM clube_membros WHERE status = 'ativo' LOOP
    PERFORM desbloquear_conquista(r.user_id, 'comunidade_1');
  END LOOP;

  FOR r IN SELECT user_id FROM clube_posts GROUP BY user_id HAVING count(*) >= 50 LOOP
    PERFORM desbloquear_conquista(r.user_id, 'comunidade_50');
  END LOOP;

  FOR r IN
    SELECT p.user_id FROM clube_post_curtidas c
    JOIN clube_posts p ON p.id = c.post_id
    GROUP BY p.user_id HAVING count(*) >= 500
  LOOP
    PERFORM desbloquear_conquista(r.user_id, 'comunidade_500');
  END LOOP;
END;
$do$;
