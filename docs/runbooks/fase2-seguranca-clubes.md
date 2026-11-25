# Runbook — Segurança de clubes (Fase 2)

Entrega de segurança aberta em 25/11/2026, depois de uma revisão das políticas de acesso feita durante a Fase 2. Migração: `supabase/migrations/*_fase2_seguranca_clubes.sql`.

**Situação:** migração escrita e testada em banco local. **Ainda não aplicada em produção.** Aplicar só com o OK do Paulo.

## 1. O que estava errado

| # | Problema | Efeito |
|---|---|---|
| 1 | `clube_membros` aceitava qualquer INSERT com `auth.uid() = user_id` | Pela API, um usuário logado entrava como `ativo` em clube privado, sem aprovação, e como `moderador` |
| 2 | `clube_membros` deixava a pessoa atualizar e apagar a própria linha sem restrição | Pedido pendente se aprovava sozinho. Banido se reativava ou apagava o banimento |
| 3 | `clubes` liberava todo clube ativo para qualquer um, inclusive sem login | Nome e descrição dos clubes privados ficavam listáveis. O app só escondia na tela |
| 4 | `eventos`, `clube_tags` e `clube_metricas` eram abertas a todos | Eventos de clube privado, com o link da reunião, ficavam públicos |
| 5 | `clube_mensagens` aceitava qualquer vínculo com o clube | Quem estava pendente ou banido lia as mensagens dos canais |

Os itens 1 e 5 combinados eram o pior caso: bastava pedir entrada em um clube privado para ler as conversas dele.

## 2. O que a migração faz

- **Gatilho `trg_clube_membros_regras`** em `clube_membros`, antes de INSERT e UPDATE. Vale só para escrita direta pela API como usuário logado. Service role, painel SQL, jobs e funções `SECURITY DEFINER` não são afetados.
  - Quem entra por conta própria vira sempre `membro`. Em clube privado fica `pendente`. Em clube público fica `ativo`.
  - Ninguém altera o próprio papel nem aprova o próprio pedido.
  - Banido não muda o próprio status.
  - Sair (`removido`) e voltar continuam permitidos, com a mesma regra de quem entra.
  - Organizador do clube e admin gerenciam membros como antes.
- **Política de DELETE** em `clube_membros`: banido não apaga a própria linha.
- **Política de SELECT em `clubes`:** clube privado só para o organizador, membros ativos e admins.
- **`eventos`, `clube_tags`, `clube_metricas`:** seguem a visibilidade do clube.
- **`clube_mensagens`:** só membro ativo ou organizador.
- **Função `clube_e_privado(uuid)`:** auxiliar do gatilho.

Nenhum dado é alterado. A página de convite não muda: quem tem o link continua vendo o cartão do clube pela função `clube_convite`.

## 3. O que muda para o usuário

- Quem abre `/clubes/:id` de um clube privado sem fazer parte é levado para `/convite/:id`. Lá vê o cartão e pede para entrar.
- Quem está com pedido pendente vê "Pedido enviado" no convite, e não mais o cabeçalho do clube.
- Todo o resto continua igual.

## 4. Ordem de aplicação

1. Mesclar o PR do app primeiro. O app novo funciona com as regras antigas e com as novas.
2. Aplicar a migração.
3. Rodar a verificação da seção 5.

Na ordem inversa, o app antigo ficaria carregando sem fim para quem abre um clube privado do qual não faz parte.

## 5. Verificação depois de aplicar

Como visitante, com a chave pública:

- `GET /rest/v1/clubes?select=nome,visibilidade` não devolve nenhum clube privado.
- `GET /rest/v1/eventos?select=titulo` não devolve evento de clube privado.
- `POST /rest/v1/rpc/clube_convite` com o id de um clube privado continua devolvendo o cartão.

No banco:

```sql
-- gatilho e políticas no lugar
select tgname from pg_trigger where tgrelid = 'public.clube_membros'::regclass and not tgisinternal;
select tablename, policyname, cmd, roles from pg_policies
where schemaname = 'public'
  and policyname in ('Ver clubes ativos', 'sair do clube', 'ler eventos', 'ler clube_tags', 'ler metricas', 'mensagens clube membros');
```

No app, com uma conta comum: abrir um clube do qual faz parte, postar no feed, ver canais e eventos. Com a conta do organizador: aprovar um pedido e alterar o papel de um membro.

## 6. Como foi testada

Banco Postgres local descartável com as políticas atuais copiadas de produção, rodando os mesmos cenários antes e depois da migração:

| Cenário | Antes | Depois |
|---|---|---|
| Visitante lista clubes | vê os privados | só os públicos |
| Visitante lista eventos | vê os de clube privado | só de clube público e gerais |
| Usuário de fora entra no privado pedindo `ativo` e `moderador` | fica `ativo/moderador` | fica `pendente/membro` |
| Esse usuário lê as mensagens do clube | lê | não lê |
| Pendente tenta se aprovar | consegue | erro "Só o organizador do clube pode aprovar a entrada." |
| Membro tenta virar moderador | consegue | papel não muda |
| Banido tenta se reativar ou apagar o banimento | consegue apagar | bloqueado |
| Mover a participação para outro clube | sem efeito | erro explícito |
| Membro ativo vê clube, mensagens e eventos | vê | vê |
| Organizadora aprova, promove, cria clube privado e remove banido | funciona | funciona |
| Escrita interna (dono do banco) | funciona | funciona |

A migração também foi aplicada duas vezes seguidas sem erro.

## 7. Reversão

Devolve as regras anteriores. Só usar se algo essencial parar de funcionar.

```sql
DROP TRIGGER IF EXISTS trg_clube_membros_regras ON public.clube_membros;

DROP POLICY IF EXISTS "sair do clube" ON public.clube_membros;
CREATE POLICY "sair do clube" ON public.clube_membros FOR DELETE TO public
  USING ((auth.uid() = user_id) OR is_clube_curador(auth.uid(), clube_id) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Ver clubes ativos" ON public.clubes;
CREATE POLICY "Ver clubes ativos" ON public.clubes FOR SELECT TO anon, authenticated
  USING ((is_ativo = true) OR (auth.uid() = curador_id) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ler eventos" ON public.eventos;
CREATE POLICY "ler eventos" ON public.eventos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "ler clube_tags" ON public.clube_tags;
CREATE POLICY "ler clube_tags" ON public.clube_tags FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "ler metricas" ON public.clube_metricas;
CREATE POLICY "ler metricas" ON public.clube_metricas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "mensagens clube membros" ON public.clube_mensagens;
CREATE POLICY "mensagens clube membros" ON public.clube_mensagens FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM clube_threads ct
    JOIN clube_canais cc ON cc.id = ct.canal_id
    JOIN clube_membros cm ON cm.clube_id = cc.clube_id
    WHERE ct.id = clube_mensagens.thread_id AND cm.user_id = auth.uid()
  ));
```

## 8. O que fica de fora

- **Moderador não aprova pedidos.** No banco, só o organizador e o admin alteram a linha de outro membro. Isso já era assim. Dar poderes ao moderador entra com o co-curador, na Fase 3.
- **Id de clube privado em leituras públicas.** Uma leitura feita dentro de um clube guarda o id do clube. Em perfil público, esse id pode aparecer. Com ele dá para abrir o cartão do convite e pedir entrada, o que equivale a receber o link. Não dá acesso ao conteúdo.
