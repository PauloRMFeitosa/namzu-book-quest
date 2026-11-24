-- Conquistas não apareciam no perfil porque nunca eram desbloqueadas:
-- 1) Conhecimento: o trigger estava na tabela legada leitura_pos, mas o app
--    grava aprendizados em leitura_conteudo, leitura_citacoes e
--    leitura_aplicacoes — nenhuma delas disparava conquista.
-- 2) Leitura: o trigger só disparava em UPDATE e só quando o total era
--    exatamente igual ao marco; livros inseridos já concluídos ou marcos
--    ultrapassados antes do trigger existir nunca concediam a conquista.
-- 3) Retroativo: concede as conquistas de leitura, conhecimento e
--    consistência a quem já cumpre os critérios hoje (mesmo padrão da
--    migração 20260704233707 para comunidade).

-- ── 1. Leitura: dispara também no INSERT e usa >= nos marcos ─────────
CREATE OR REPLACE FUNCTION public.trg_gamificacao_livro_concluido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_total int;
BEGIN
  IF NEW.status NOT IN ('concluido', 'lido') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('concluido', 'lido') THEN RETURN NEW; END IF;

  PERFORM conceder_xp(NEW.user_id, 50, 'livro_concluido', NEW.obra_id);

  SELECT COUNT(*) INTO v_total
  FROM usuario_livros
  WHERE user_id = NEW.user_id
    AND status IN ('concluido', 'lido');

  -- >= em vez de =: desbloquear_conquista é idempotente, então marcos
  -- ultrapassados sem disparo exato não ficam mais para trás
  IF v_total >= 1   THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_1');   END IF;
  IF v_total >= 5   THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_5');   END IF;
  IF v_total >= 10  THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_10');  END IF;
  IF v_total >= 50  THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_50');  END IF;
  IF v_total >= 100 THEN PERFORM desbloquear_conquista(NEW.user_id, 'leitura_100'); END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_gamificacao_livro_concluido ON public.usuario_livros;
CREATE TRIGGER trg_gamificacao_livro_concluido
  AFTER INSERT OR UPDATE OF status ON public.usuario_livros
  FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_livro_concluido();

-- ── 2. Conhecimento: triggers nas tabelas reais de aprendizado ───────
CREATE OR REPLACE FUNCTION public.trg_gamificacao_conhecimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_user_id uuid;
  v_total   int;
BEGIN
  SELECT user_id INTO v_user_id FROM leituras WHERE id = NEW.leitura_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM conceder_xp(v_user_id, 20, 'insight_registrado', NEW.leitura_id);

  SELECT (SELECT count(*) FROM leitura_conteudo   c JOIN leituras l ON l.id = c.leitura_id WHERE l.user_id = v_user_id)
       + (SELECT count(*) FROM leitura_citacoes   c JOIN leituras l ON l.id = c.leitura_id WHERE l.user_id = v_user_id)
       + (SELECT count(*) FROM leitura_aplicacoes c JOIN leituras l ON l.id = c.leitura_id WHERE l.user_id = v_user_id)
  INTO v_total;

  IF v_total >= 1   THEN PERFORM desbloquear_conquista(v_user_id, 'conhecimento_1');   END IF;
  IF v_total >= 10  THEN PERFORM desbloquear_conquista(v_user_id, 'conhecimento_10');  END IF;
  IF v_total >= 100 THEN PERFORM desbloquear_conquista(v_user_id, 'conhecimento_100'); END IF;

  RETURN NEW;
END;
$fn$;

-- o trigger legado apontava para leitura_pos, tabela que o app não usa mais
DROP TRIGGER IF EXISTS trg_gamificacao_insight ON public.leitura_pos;

DROP TRIGGER IF EXISTS trg_gamificacao_conhecimento ON public.leitura_conteudo;
CREATE TRIGGER trg_gamificacao_conhecimento
  AFTER INSERT ON public.leitura_conteudo
  FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_conhecimento();

DROP TRIGGER IF EXISTS trg_gamificacao_conhecimento ON public.leitura_citacoes;
CREATE TRIGGER trg_gamificacao_conhecimento
  AFTER INSERT ON public.leitura_citacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_conhecimento();

DROP TRIGGER IF EXISTS trg_gamificacao_conhecimento ON public.leitura_aplicacoes;
CREATE TRIGGER trg_gamificacao_conhecimento
  AFTER INSERT ON public.leitura_aplicacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_conhecimento();

-- ── 3. Retroativo: concede a quem já cumpre os critérios ─────────────
DO $do$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT user_id, count(*) AS total
    FROM usuario_livros
    WHERE status IN ('concluido', 'lido')
    GROUP BY user_id
  LOOP
    IF r.total >= 1   THEN PERFORM desbloquear_conquista(r.user_id, 'leitura_1');   END IF;
    IF r.total >= 5   THEN PERFORM desbloquear_conquista(r.user_id, 'leitura_5');   END IF;
    IF r.total >= 10  THEN PERFORM desbloquear_conquista(r.user_id, 'leitura_10');  END IF;
    IF r.total >= 50  THEN PERFORM desbloquear_conquista(r.user_id, 'leitura_50');  END IF;
    IF r.total >= 100 THEN PERFORM desbloquear_conquista(r.user_id, 'leitura_100'); END IF;
  END LOOP;

  FOR r IN
    SELECT l.user_id, count(*) AS total
    FROM (
      SELECT leitura_id FROM leitura_conteudo
      UNION ALL SELECT leitura_id FROM leitura_citacoes
      UNION ALL SELECT leitura_id FROM leitura_aplicacoes
    ) x
    JOIN leituras l ON l.id = x.leitura_id
    GROUP BY l.user_id
  LOOP
    IF r.total >= 1   THEN PERFORM desbloquear_conquista(r.user_id, 'conhecimento_1');   END IF;
    IF r.total >= 10  THEN PERFORM desbloquear_conquista(r.user_id, 'conhecimento_10');  END IF;
    IF r.total >= 100 THEN PERFORM desbloquear_conquista(r.user_id, 'conhecimento_100'); END IF;
  END LOOP;

  FOR r IN
    SELECT user_id, streak_maximo
    FROM gamificacao_perfis
    WHERE streak_maximo >= 7
  LOOP
    IF r.streak_maximo >= 7   THEN PERFORM desbloquear_conquista(r.user_id, 'consistencia_7');   END IF;
    IF r.streak_maximo >= 30  THEN PERFORM desbloquear_conquista(r.user_id, 'consistencia_30');  END IF;
    IF r.streak_maximo >= 100 THEN PERFORM desbloquear_conquista(r.user_id, 'consistencia_100'); END IF;
  END LOOP;
END;
$do$;
