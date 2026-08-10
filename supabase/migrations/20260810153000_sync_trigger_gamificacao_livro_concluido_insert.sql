-- ============================================================
-- Sincroniza o repositório com a definição VIVA do trigger
-- trg_gamificacao_livro_concluido no projeto remoto.
--
-- Contexto: o banco remoto foi alterado diretamente em algum momento
-- (dashboard/sessão anterior) sem gerar a migração correspondente. A versão
-- registrada em 20260624131906_fase1_unificar_motor_xp.sql ficou defasada:
--   - disparava apenas AFTER UPDATE (não concedia XP ao adicionar um livro
--     já como "lido"/"concluido" via INSERT);
--   - marcava conquistas com "= N" (marcos ultrapassados sem o disparo exato
--     ficavam para trás).
--
-- Esta migração apenas ESPELHA o que já está no remoto — é idempotente e não
-- altera o comportamento em produção (o banco já concede 50 XP também no
-- INSERT). Serve para que uma reconstrução a partir das migrações produza o
-- trigger correto.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_gamificacao_livro_concluido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Trigger dispara em INSERT e em UPDATE de status, para cobrir tanto o fluxo
-- normal (mudar status para concluído) quanto a adição direta como "lido".
DROP TRIGGER IF EXISTS trg_gamificacao_livro_concluido ON public.usuario_livros;
CREATE TRIGGER trg_gamificacao_livro_concluido
  AFTER INSERT OR UPDATE OF status ON public.usuario_livros
  FOR EACH ROW EXECUTE FUNCTION public.trg_gamificacao_livro_concluido();
