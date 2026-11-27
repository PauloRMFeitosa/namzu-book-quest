-- Limites dos planos do organizador (docs/planos.md).
--
-- Os planos passam a valer para os três limites de quantidade: clubes por
-- organizador, membros por clube e co-curadores por clube. O banco recusa o
-- que passa do limite, com mensagem em português para o app mostrar.
--
-- Enquanto a cobrança não é ativada, vale o plano "Lançamento": grátis, com
-- todos os recursos e sem limites. Ele entra como plano padrão, então ninguém
-- é bloqueado por esta migração. Para limitar alguém, o admin atribui outro
-- plano à pessoa em Admin > Planos.
--
-- Regras:
--   - O plano de um clube é o do organizador (quem criou). Vale o plano
--     atribuído, se não estiver vencido; senão, o plano padrão.
--   - Limite vazio (NULL) é sem limite. Sem plano padrão e sem atribuição,
--     não há limite.
--   - Os limites barram só o que é novo: quem já está acima continua como
--     está, mas não cresce.
--   - Pedido de entrada pendente não conta como membro; o limite barra a
--     aprovação.
--
-- Ainda não aplicado: limite de usos de IA e os recursos de cada plano.

-- Plano que vale para a pessoa.
CREATE OR REPLACE FUNCTION public.plano_do_organizador(p_user_id uuid)
RETURNS public.planos
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano public.planos;
BEGIN
  SELECT pl.* INTO v_plano
  FROM public.organizador_planos op
  JOIN public.planos pl ON pl.id = op.plano_id
  WHERE op.user_id = p_user_id
    AND (op.valido_ate IS NULL OR op.valido_ate >= current_date);

  IF v_plano.id IS NULL THEN
    SELECT pl.* INTO v_plano FROM public.planos pl WHERE pl.padrao AND pl.arquivado_em IS NULL;
  END IF;

  RETURN v_plano;
END;
$$;

REVOKE ALL ON FUNCTION public.plano_do_organizador(uuid) FROM PUBLIC, anon, authenticated;

-- Limite de clubes por organizador.
CREATE OR REPLACE FUNCTION public.trg_clubes_limite_do_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano public.planos;
  v_clubes integer;
BEGIN
  IF NEW.is_ativo IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_ativo IS TRUE AND NEW.curador_id = OLD.curador_id THEN
    RETURN NEW;
  END IF;

  v_plano := public.plano_do_organizador(NEW.curador_id);
  IF v_plano.limite_clubes IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_clubes
  FROM public.clubes c
  WHERE c.curador_id = NEW.curador_id AND c.is_ativo = true AND c.id <> NEW.id;

  IF v_clubes >= v_plano.limite_clubes THEN
    RAISE EXCEPTION 'O plano % permite organizar até % clube(s), e você já tem %.',
      v_plano.nome, v_plano.limite_clubes, v_clubes
      USING ERRCODE = 'P0001', HINT = 'limite_clubes';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_clubes_limite_do_plano() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_clubes_limite_do_plano ON public.clubes;
CREATE TRIGGER trg_clubes_limite_do_plano
  BEFORE INSERT OR UPDATE OF is_ativo, curador_id ON public.clubes
  FOR EACH ROW EXECUTE FUNCTION public.trg_clubes_limite_do_plano();

-- Limite de membros e de co-curadores por clube. O nome com "zz" faz este
-- gatilho rodar depois de trg_clube_membros_regras, que decide o status final
-- de quem entra (ativo ou pendente).
CREATE OR REPLACE FUNCTION public.trg_clube_membros_limite_do_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano public.planos;
  v_total integer;
  v_vira_ativo boolean;
  v_vira_co_curador boolean;
BEGIN
  v_vira_ativo := NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ativo');
  v_vira_co_curador := NEW.papel = 'co_curador' AND (TG_OP = 'INSERT' OR OLD.papel IS DISTINCT FROM 'co_curador');
  IF NOT v_vira_ativo AND NOT v_vira_co_curador THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_plano
  FROM public.plano_do_organizador((SELECT c.curador_id FROM public.clubes c WHERE c.id = NEW.clube_id));

  IF v_vira_ativo AND v_plano.limite_membros IS NOT NULL THEN
    SELECT count(*) INTO v_total
    FROM public.clube_membros m
    WHERE m.clube_id = NEW.clube_id AND m.status = 'ativo' AND m.user_id <> NEW.user_id;
    IF v_total >= v_plano.limite_membros THEN
      RAISE EXCEPTION 'Este clube está com todas as % vagas ocupadas. O organizador precisa liberar vagas ou mudar de plano.',
        v_plano.limite_membros
        USING ERRCODE = 'P0001', HINT = 'limite_membros';
    END IF;
  END IF;

  IF v_vira_co_curador AND v_plano.limite_co_curadores IS NOT NULL THEN
    SELECT count(*) INTO v_total
    FROM public.clube_membros m
    WHERE m.clube_id = NEW.clube_id AND m.papel = 'co_curador' AND m.user_id <> NEW.user_id;
    IF v_total >= v_plano.limite_co_curadores THEN
      RAISE EXCEPTION 'O plano % permite até % co-curador(es) por clube.',
        v_plano.nome, v_plano.limite_co_curadores
        USING ERRCODE = 'P0001', HINT = 'limite_co_curadores';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_clube_membros_limite_do_plano() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_clube_membros_zz_limite_do_plano ON public.clube_membros;
CREATE TRIGGER trg_clube_membros_zz_limite_do_plano
  BEFORE INSERT OR UPDATE OF status, papel ON public.clube_membros
  FOR EACH ROW EXECUTE FUNCTION public.trg_clube_membros_limite_do_plano();

-- Plano e uso de um clube, para o painel do organizador. Só para quem gere o
-- clube e admins.
CREATE OR REPLACE FUNCTION public.clube_plano(p_clube_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_curador uuid;
  v_plano public.planos;
BEGIN
  SELECT c.curador_id INTO v_curador FROM public.clubes c WHERE c.id = p_clube_id;
  IF v_uid IS NULL OR v_curador IS NULL
     OR NOT (public.is_clube_curador(v_uid, p_clube_id) OR public.has_role(v_uid, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Só quem organiza o clube vê o plano.' USING ERRCODE = '42501';
  END IF;

  v_plano := public.plano_do_organizador(v_curador);

  RETURN jsonb_build_object(
    'plano', CASE WHEN v_plano.id IS NULL THEN NULL ELSE jsonb_build_object(
      'chave', v_plano.chave,
      'nome', v_plano.nome,
      'descricao', v_plano.descricao,
      'preco_mensal_centavos', v_plano.preco_mensal_centavos,
      'limite_membros', v_plano.limite_membros,
      'limite_clubes', v_plano.limite_clubes,
      'limite_co_curadores', v_plano.limite_co_curadores,
      'limite_ia_mes', v_plano.limite_ia_mes,
      'recursos', to_jsonb(v_plano.recursos),
      'padrao', v_plano.padrao
    ) END,
    'valido_ate', (SELECT op.valido_ate FROM public.organizador_planos op
                   WHERE op.user_id = v_curador AND op.plano_id = v_plano.id),
    'uso', jsonb_build_object(
      'membros', (SELECT count(*) FROM public.clube_membros m WHERE m.clube_id = p_clube_id AND m.status = 'ativo'),
      'co_curadores', (SELECT count(*) FROM public.clube_membros m
                       WHERE m.clube_id = p_clube_id AND m.status = 'ativo' AND m.papel = 'co_curador'),
      'clubes', (SELECT count(*) FROM public.clubes c WHERE c.curador_id = v_curador AND c.is_ativo = true)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.clube_plano(uuid) IS
  'Plano que vale para o clube (o do organizador) e quanto do limite já foi usado.';

REVOKE ALL ON FUNCTION public.clube_plano(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_plano(uuid) TO authenticated, service_role;

-- Plano de quem está logado e quantos clubes já organiza, para a criação de clube.
CREATE OR REPLACE FUNCTION public.meu_plano()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plano public.planos;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para ver o plano.' USING ERRCODE = '42501';
  END IF;

  v_plano := public.plano_do_organizador(v_uid);

  RETURN jsonb_build_object(
    'plano', CASE WHEN v_plano.id IS NULL THEN NULL ELSE jsonb_build_object(
      'chave', v_plano.chave,
      'nome', v_plano.nome,
      'limite_membros', v_plano.limite_membros,
      'limite_clubes', v_plano.limite_clubes
    ) END,
    'clubes', (SELECT count(*) FROM public.clubes c WHERE c.curador_id = v_uid AND c.is_ativo = true)
  );
END;
$$;

COMMENT ON FUNCTION public.meu_plano() IS
  'Plano de quem está logado e quantos clubes ativos organiza.';

REVOKE ALL ON FUNCTION public.meu_plano() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_plano() TO authenticated, service_role;

-- Plano que vale enquanto a cobrança não é ativada: tudo liberado. Entra como
-- padrão (o gatilho de planos tira a marca do padrão anterior).
INSERT INTO public.planos
  (chave, nome, descricao, preco_mensal_centavos, limite_membros, limite_clubes, limite_co_curadores, limite_ia_mes,
   recursos, publicado, destaque, padrao, ordem)
SELECT
   'lancamento', 'Lançamento',
   'Acesso completo e gratuito enquanto a cobrança não é ativada.',
   0, NULL::integer, NULL::integer, NULL::integer, NULL::integer,
   ARRAY['trilha','encontros','votacao_data','avisos','convite_link','feed','canais','microgrupos','conteudos','ranking',
         'painel_pendencias','painel_historico','exportacao','ia_copiloto','ia_provocacao','ia_resumo','ia_recomendacoes',
         'pagina_publica','endereco_namzu','pagina_personalizada','sem_marca_namzu','dominio_proprio','mensalidade'],
   false, false, true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.planos WHERE chave = 'lancamento');
