-- Fase 2 (docs/roadmap.md) — segurança de clubes: entrada de membros e clubes privados.
--
-- Problemas encontrados ao revisar as políticas (25/11/2026):
--
--   1. Entrada sem controle. A política de INSERT em `clube_membros` só conferia
--      `auth.uid() = user_id`. Pela API, qualquer usuário logado conseguia se
--      inserir como `ativo` em clube privado (sem aprovação) e como `moderador`.
--      A política de UPDATE deixava a pessoa alterar a própria linha, então um
--      pedido pendente podia se aprovar sozinho e um banido podia se reativar.
--
--   2. Clubes privados visíveis. A política de SELECT em `clubes` liberava todo
--      clube ativo para qualquer um, inclusive sem login. O app só escondia os
--      privados na tela. O mesmo valia para `eventos` (com o link da reunião),
--      `clube_tags` e `clube_metricas`. E `clube_mensagens` aceitava qualquer
--      vínculo com o clube, inclusive pedido pendente.
--
-- O que muda:
--   - Gatilho em `clube_membros` que aplica as regras de entrada na escrita
--     feita pela API. Escrita interna (service role, painel SQL, jobs e funções
--     SECURITY DEFINER) não é afetada.
--   - Clube privado só aparece para o organizador, membros ativos e admins.
--     Quem tem o link continua vendo o cartão pela função `clube_convite`.
--   - Eventos, tags e métricas seguem a visibilidade do clube.
--   - Mensagens dos canais só para membro ativo ou organizador, como já era
--     nos canais e nas threads.
--   - Moderador passa a aprovar e recusar pedidos de entrada. A tela já
--     mostrava os botões, mas o banco ignorava a ação em silêncio.
--
-- Nenhum dado é alterado.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Regras de entrada em clube_membros
-- ───────────────────────────────────────────────────────────────────────────

-- Lê a visibilidade mesmo quando a linha do clube não é visível para quem chama.
CREATE OR REPLACE FUNCTION public.clube_e_privado(_clube uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c.visibilidade = 'privado' FROM public.clubes c WHERE c.id = _clube),
    true
  );
$$;

REVOKE ALL ON FUNCTION public.clube_e_privado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clube_e_privado(uuid) TO authenticated, service_role;

-- Moderador: membro ativo do clube com papel de moderador.
CREATE OR REPLACE FUNCTION public.is_clube_moderador(_user uuid, _clube uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clube_membros
    WHERE user_id = _user AND clube_id = _clube
      AND status = 'ativo' AND papel = 'moderador'
  );
$$;

REVOKE ALL ON FUNCTION public.is_clube_moderador(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clube_moderador(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_clube_membros_regras()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Só a escrita direta pela API, como usuário logado, passa pelas regras.
  IF current_user <> 'authenticated' OR v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.clube_id <> OLD.clube_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'Não é possível mover uma participação para outro clube ou usuário.'
      USING ERRCODE = '42501';
  END IF;

  -- Organizador do clube e admin gerenciam membros livremente.
  IF public.is_clube_curador(v_uid, NEW.clube_id)
     OR public.has_role(v_uid, 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Quem entra por conta própria é sempre membro comum. Em clube privado
    -- fica pendente até o organizador aprovar.
    NEW.papel := 'membro';
    NEW.status := CASE WHEN public.clube_e_privado(NEW.clube_id) THEN 'pendente' ELSE 'ativo' END;
    RETURN NEW;
  END IF;

  -- Daqui em diante é UPDATE feito por quem não é organizador nem admin.
  -- O papel e a data de entrada nunca mudam por esse caminho.
  NEW.papel := OLD.papel;
  NEW.data_entrada := OLD.data_entrada;

  -- Linha de outra pessoa: só o moderador chega aqui (pela política abaixo),
  -- e só para aprovar um pedido de entrada.
  IF OLD.user_id <> v_uid THEN
    IF public.is_clube_moderador(v_uid, NEW.clube_id)
       AND OLD.status = 'pendente' AND NEW.status = 'ativo' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Moderador só pode aprovar ou recusar pedidos de entrada.'
      USING ERRCODE = '42501';
  END IF;

  -- Própria linha.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'banido' THEN
      RAISE EXCEPTION 'Você foi removido deste clube pelo organizador.'
        USING ERRCODE = '42501';
    ELSIF NEW.status = 'removido' THEN
      NULL; -- sair do clube
    ELSIF OLD.status = 'removido' THEN
      -- voltar ao clube segue a mesma regra de quem entra
      NEW.status := CASE WHEN public.clube_e_privado(NEW.clube_id) THEN 'pendente' ELSE 'ativo' END;
    ELSE
      RAISE EXCEPTION 'Só o organizador do clube pode aprovar a entrada.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_clube_membros_regras() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_clube_membros_regras ON public.clube_membros;
CREATE TRIGGER trg_clube_membros_regras
  BEFORE INSERT OR UPDATE ON public.clube_membros
  FOR EACH ROW EXECUTE FUNCTION public.trg_clube_membros_regras();

-- Banido não apaga a própria linha (apagaria o banimento e poderia entrar de novo).
-- Moderador recusa pedido pendente.
DROP POLICY IF EXISTS "sair do clube" ON public.clube_membros;
CREATE POLICY "sair do clube" ON public.clube_membros
  FOR DELETE TO authenticated
  USING (
    (auth.uid() = user_id AND status <> 'banido')
    OR public.is_clube_curador(auth.uid(), clube_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (status = 'pendente' AND public.is_clube_moderador(auth.uid(), clube_id))
  );

-- Moderador aprova pedido pendente: só de pendente para ativo, como membro comum.
DROP POLICY IF EXISTS "moderador aprova pedidos" ON public.clube_membros;
CREATE POLICY "moderador aprova pedidos" ON public.clube_membros
  FOR UPDATE TO authenticated
  USING (status = 'pendente' AND public.is_clube_moderador(auth.uid(), clube_id))
  WITH CHECK (status = 'ativo' AND papel = 'membro' AND public.is_clube_moderador(auth.uid(), clube_id));

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Clube privado só para quem faz parte
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Ver clubes ativos" ON public.clubes;
CREATE POLICY "Ver clubes ativos" ON public.clubes
  FOR SELECT TO anon, authenticated
  USING (
    (is_ativo = true AND visibilidade <> 'privado')
    OR auth.uid() = curador_id
    OR (is_ativo = true AND public.is_clube_membro(auth.uid(), id))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- As três tabelas abaixo eram abertas a todos. Passam a seguir o clube: a
-- subconsulta em `clubes` respeita a política acima para quem está consultando.
DROP POLICY IF EXISTS "ler eventos" ON public.eventos;
CREATE POLICY "ler eventos" ON public.eventos
  FOR SELECT TO public
  USING (
    clube_id IS NULL
    OR EXISTS (SELECT 1 FROM public.clubes c WHERE c.id = eventos.clube_id)
  );

DROP POLICY IF EXISTS "ler clube_tags" ON public.clube_tags;
CREATE POLICY "ler clube_tags" ON public.clube_tags
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.clubes c WHERE c.id = clube_tags.clube_id));

DROP POLICY IF EXISTS "ler metricas" ON public.clube_metricas;
CREATE POLICY "ler metricas" ON public.clube_metricas
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.clubes c WHERE c.id = clube_metricas.clube_id));

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Mensagens dos canais: só membro ativo ou organizador
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mensagens clube membros" ON public.clube_mensagens;
CREATE POLICY "mensagens clube membros" ON public.clube_mensagens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clube_threads ct
      JOIN public.clube_canais cc ON cc.id = ct.canal_id
      WHERE ct.id = clube_mensagens.thread_id
        AND (
          public.is_clube_membro(auth.uid(), cc.clube_id)
          OR public.is_clube_curador(auth.uid(), cc.clube_id)
        )
    )
  );
