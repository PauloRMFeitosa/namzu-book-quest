# Runbook — Fase 0: segredo do agendador para as Edge Functions de lote

**Escopo:** itens 1.1 a 1.5 de `docs/auditoria-edge-functions-2026-11.md`.
**Situação:** **aplicado em produção em 24/11/2026**, com autorização de Paulo. Falta o teste de fumaça no painel admin e a conferência dos primeiros disparos reais do agendador.

## Registro da aplicação

| Passo | Resultado |
|---|---|
| Migração | registrada no remoto como `20261124191704_fase0_segredo_agendador` |
| Segredo no Vault | 1 segredo, 64 caracteres. A RPC aceita o valor certo e recusa um errado |
| Jobs do `pg_cron` | os 4 enviam `x-cron-secret`; nenhum carrega token em texto puro; mesmos ids e horários |
| `enviar-lembretes-meta` | versão 2 |
| `reprocessar-generos` | versão 8 |
| `reprocessar-obras` | versão 3 |
| `reprocessar-autores` | versão 3, agora com o limite de 90 do repo |
| Chamada sem credencial, com a chave pública e com segredo errado | 401 nas quatro funções |
| Preflight CORS | 200 nas quatro |
| Chamada disparada do banco com o segredo do Vault, na `enviar-lembretes-meta` | 200, confirmando o caminho do agendador de ponta a ponta |
| Código publicado x repo | baixado e comparado token a token; só parênteses diferem, efeito do compilador |

**Job de autores:** fica ativo, por decisão de Paulo. O primeiro disparo real com a função nova é às 03:00 UTC de 25/11.

**Como as funções foram publicadas:** direto dos arquivos do repo, pela API de gestão do Supabase com o token de acesso da conta, para que o conteúdo publicado fosse exatamente o do disco.

**Ainda não observado:** os disparos reais do agendador para `reprocessar-generos` (00:00 UTC), `reprocessar-autores` (03:00 UTC) e `reprocessar-obras` (04:00 UTC). O mecanismo é o mesmo já validado na função de lembretes.

## O problema

O `pg_cron` chama quatro Edge Functions sem credencial:

| Função | Job | Situação hoje |
|---|---|---|
| `reprocessar-generos` | a cada 6 h | Sem nenhuma checagem. Qualquer pessoa dispara o lote, que grava com a chave de serviço |
| `reprocessar-obras` | diário, 04:00 UTC | Lote aberto; só o modo de uma obra exige admin |
| `reprocessar-autores` | diário, 03:00 UTC | Exige admin sempre. O job recebe 401 e não processa nada desde junho |
| `enviar-lembretes-meta` | a cada 15 min | Checagem opcional por uma variável que nunca foi definida. Aberta. O job carrega um token em texto puro |

## A solução

Um segredo gerado dentro do banco e guardado no Vault do Supabase.

- Os jobs leem o segredo do Vault e o enviam no cabeçalho `x-cron-secret`.
- As quatro funções passam a aceitar só duas origens: o agendador, com o segredo conferido pela RPC `verificar_segredo_cron`, ou um admin autenticado, que é o caso do painel.
- O segredo nunca sai do banco. Não fica em variável de ambiente, no código, nem no texto do comando do job.

Arquivos: `supabase/functions/_shared/auth.ts` (função `autorizarAdminOuCron`), as quatro funções, e `supabase/migrations/20261124191704_fase0_segredo_agendador.sql`.

## Mudanças de comportamento

1. **O job de autores volta a funcionar.** Hoje ele falha toda madrugada. Depois da entrega, processa 10 autores por dia e grava no cadastro do autor os dados do Wikidata quando a pontuação é 90 ou mais. Abaixo disso o autor vai para revisão manual. O limite em produção hoje é 80; o repo, que é o mais novo, usa 90.
2. **Chamadas anônimas passam a receber 401** nas quatro funções. Nenhuma tela do app faz chamada anônima a elas.
3. **A variável `LEMBRETES_CRON_SECRET` deixa de existir** no código. Ela nunca chegou a ser definida.

Para pausar o job de autores: `select cron.alter_job(5, active := false);`.

## Como foi verificado

- **Autorização:** oito cenários rodados em Deno contra o código real de `_shared/auth.ts`, com as respostas do Supabase simuladas. Todos passaram: sem credencial e chave pública recebem 401; segredo certo passa como agendador; segredo errado recebe 401 mesmo acompanhado de um token de admin; usuário comum recebe 403; admin passa.
- **Migração:** aplicada duas vezes em Postgres 16 local com Vault, `pg_cron` e `pg_net` simulados. Cria um único segredo de 64 caracteres, atualiza os quatro jobs, não deixa token em texto puro e não grava o valor do segredo no comando do job. Executando os comandos dos jobs, as quatro chamadas saem com o segredo certo no cabeçalho.
- **Permissões:** `verificar_segredo_cron` responde para `service_role` e é negada para `anon` e `authenticated`.
- **Assinaturas conferidas em produção por leitura:** `vault.create_secret`, `cron.schedule` com nome, `net.http_post`; `postgres` lê `vault.decrypted_secrets`; `pg_cron` 1.6.4.
- `npm run lint`, `typecheck`, `test` e `build` passam. O `deno check` das funções tem os mesmos erros de tipo antigos de antes, nenhum novo.

O Vault real e as funções em execução foram validados na aplicação; ver o registro acima.

## Ordem de aplicação

A ordem evita qualquer janela de falha: enquanto as funções antigas estão no ar, elas ignoram o cabeçalho novo.

1. Aplicar a migração: cria o segredo, a RPC e atualiza os quatro jobs.
2. Conferir, por consulta, que a RPC aceita o segredo do Vault.
3. Publicar `enviar-lembretes-meta` e testar de ponta a ponta com uma chamada disparada do banco. Essa função hoje não envia nada, então serve de teste seguro.
4. Publicar `reprocessar-generos`, `reprocessar-obras` e `reprocessar-autores`.
5. Conferir que as quatro recusam chamadas sem credencial.
6. Renomear o arquivo da migração para a versão registrada.

## Verificação pós-aplicação

```sql
-- 1 linha, com `aceita = true` e nenhum token em texto puro nos jobs
select
  public.verificar_segredo_cron(
    (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')) as aceita,
  (select count(*) from cron.job where command like '%vault.decrypted_secrets%') as jobs_com_segredo,
  (select count(*) from cron.job where command ~ 'Bearer') as jobs_com_token_puro;
```

Nos dias seguintes, os logs das funções devem mostrar 200 nas chamadas do agendador, inclusive a de `reprocessar-autores` às 03:00 UTC.

## Teste de fumaça no app, pelo admin

- [ ] Painel admin, reprocessamento de gêneros no modo de teste: deve rodar.
- [ ] Painel admin, reprocessamento de autores com quantidade pequena: deve rodar.
- [ ] Painel admin, enriquecer uma obra pelo Wikidata: deve rodar.

## Reversão

- Funções: republicar a versão anterior pelo painel do Supabase.
- Jobs: reaplicar os comandos antigos, que estão em `supabase/migrations/20260612153335_fix_cron_jobs_usar_net_http_post.sql` e seguintes. O segredo e a RPC podem ficar; sem uso, não têm efeito.
