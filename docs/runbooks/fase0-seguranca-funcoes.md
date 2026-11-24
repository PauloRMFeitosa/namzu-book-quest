# Runbook — Fase 0: segurança de funções (banco e Edge Functions)

**Escopo:** primeira entrega de segurança da Fase 0 do `docs/roadmap.md`.
**Situação:** **aplicado em produção em 24/11/2026**, com autorização de Paulo. Teste de fumaça no app feito por Paulo no mesmo dia, sem problemas. Os jobs agendados das 17:45 UTC rodaram com sucesso após a migração.

## Registro da aplicação

| Passo | Resultado |
|---|---|
| `ensure-profiles` publicada | versão 15. Sem credencial e com a chave pública responde 401 |
| `rapid-action` publicada | versão 33. Sem credencial e com a chave pública responde 401; preflight CORS responde 200 |
| Migração aplicada | registrada no remoto como `20261124173944_fase0_seguranca_funcoes` |
| Funções internas ainda acessíveis pela API | 0 |
| Funções `SECURITY DEFINER` executáveis por `anon` | 5, as exceções previstas |
| Funções sem `search_path` | 2, as exceções previstas |
| RPCs usadas pelo app seguem executáveis por `authenticated` | sim |
| `postgres` (cron) e `service_role` seguem com acesso às funções internas | sim |

**Desvio encontrado na hora de publicar:** a `rapid-action` do repositório era uma versão de junho, diferente da que rodava em produção. A versão de produção devolve `edicao_id`, campo que o app atual usa, e delega a busca para `search-books`. Publicar a versão do repo teria causado regressão. A proteção foi aplicada sobre o código de produção, e esse código passou a ser o do repositório.

**Diferença conhecida entre o repo e a versão 33 publicada:** duas correções de lint sem efeito no comportamento (`let` trocado por `const` e um escape desnecessário removido de uma expressão regular). Elas entram em produção no próximo deploy da função.

## O que muda

| Item | Antes | Depois |
|---|---|---|
| Edge Function `rapid-action` | Qualquer pessoa na internet cria ou altera obras, autores e edições | Exige usuário autenticado |
| Edge Function `ensure-profiles` | Qualquer pessoa dispara a listagem de todos os usuários e a criação de perfis | Cria só o perfil de quem chama; backfill geral restrito a admin (`{ "todos": true }`) |
| 8 funções internas do banco (`conceder_xp`, `desbloquear_conquista`, `registrar_progresso_missao`, `creditar_xp_clube`, `calcular_matches`, `fechar_liga_semanal`, `fn_renotificar_avaliacoes_dispensadas`, `rls_auto_enable`) | Chamáveis pela API por usuário logado; 2 delas também por anônimo | Sem acesso pela API. Seguem funcionando por trigger, cron e funções internas |
| 25 funções de trigger `SECURITY DEFINER` | Expostas em `/rest/v1/rpc` | Sem `EXECUTE` para `anon` e `authenticated` |
| `definir_perfil_publico`, `get_atividade_leitura_anual`, `get_interacoes_diarias` | Aceitam `anon` | Somente `authenticated` |
| 32 funções sem `search_path` | Caminho de busca mutável | `search_path = public, extensions` |

Arquivos: `supabase/functions/_shared/auth.ts`, `supabase/functions/rapid-action/index.ts`, `supabase/functions/ensure-profiles/index.ts`, `supabase/migrations/20261124173944_fase0_seguranca_funcoes.sql`.

## Como foi verificado

- **Assinaturas:** as 56 assinaturas usadas na migração foram conferidas contra o banco remoto com `to_regprocedure` (consulta de leitura). Nenhuma inexistente.
- **Quem chama o quê:** `pg_proc.prosrc` mostrou que as 8 funções internas só são chamadas por funções `SECURITY DEFINER`, que rodam como o dono (`postgres`). O app (`grep` por `.rpc(`) não chama nenhuma delas. Os jobs do `pg_cron` rodam como `postgres`.
- **Políticas RLS:** `has_role`, `is_clube_curador`, `is_clube_membro` e `pode_ver_leituras_de` são referenciadas 84 vezes em políticas RLS, várias avaliadas para `anon`. Por isso **não** são revogadas.
- **Teste em Postgres 16 local** com funções de mesmo modelo de segurança:
  - antes da migração, usuário logado concedeu XP a outra pessoa chamando `conceder_xp` direto (a falha);
  - depois, a mesma chamada falha com `permission denied`;
  - o trigger de livro concluído continua concedendo XP ao inserir e ao atualizar;
  - `definir_perfil_publico` funciona para `authenticated` e falha para `anon`;
  - leitura anônima de tabela cuja política usa `has_role` continua funcionando; e quebra se `has_role` for revogada (controle que justifica a exceção).
- **Sintaxe:** a migração completa rodou sem erro contra 56 stubs com as assinaturas de produção (36 `REVOKE`, 3 `GRANT`, 32 `ALTER`).
- **Edge Functions:** `deno check` limpo em `_shared/auth.ts`, `ensure-profiles` e `rapid-action`.

O caminho autenticado das Edge Functions não pôde ser testado por mim, porque exige a sessão de um usuário real. É o que o teste de fumaça abaixo cobre.

## Ordem de aplicação

1. Publicar `ensure-profiles` e `rapid-action` (com `_shared/auth.ts` e `_shared/generos.ts`).
2. Aplicar a migração e renomear o arquivo para a versão registrada pelo Supabase, conforme `supabase/migrations/README.md`.
3. Rodar a verificação e o teste de fumaça.

## Verificação pós-aplicação

```sql
-- Deve retornar 0 linhas: nenhuma função interna acessível pela API
select p.oid::regprocedure
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('conceder_xp','desbloquear_conquista','registrar_progresso_missao',
                    'creditar_xp_clube','calcular_matches','fechar_liga_semanal',
                    'fn_renotificar_avaliacoes_dispensadas','rls_auto_enable')
  and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
```

Depois, rodar os advisors de segurança do Supabase. Esperado: o aviso de função `SECURITY DEFINER` executável por `anon` cai de 15 para 5 (as 4 auxiliares de RLS e `match_clubes_por_gosto`), e o de `search_path` mutável cai de 34 para 2.

## Teste de fumaça no app

- [ ] Login e abertura da home.
- [ ] `/comecar` em janela anônima até a tela de resultado (usa `match_clubes_por_gosto` sem login).
- [ ] Busca: adicionar um livro em "Quero ler" (usa `rapid-action`).
- [ ] Cadastro manual de obra (usa `rapid-action`).
- [ ] Marcar um livro como lido e conferir o XP (trigger chama `conceder_xp`).
- [ ] Registrar um insight (trigger de missão).
- [ ] Alternar perfil público/privado nas configurações.
- [ ] Abrir um perfil público de outro usuário (usa `get_atividade_leitura_anual`).

## Reversão

Edge Functions: republicar a versão anterior pelo painel do Supabase.

Banco (devolve o estado anterior de permissões; o `search_path` pode ficar):

```sql
GRANT EXECUTE ON FUNCTION
  public.conceder_xp(uuid, integer, text, uuid, uuid),
  public.desbloquear_conquista(uuid, text),
  public.registrar_progresso_missao(uuid, text, integer),
  public.creditar_xp_clube(uuid, uuid, integer),
  public.calcular_matches(uuid),
  public.fechar_liga_semanal(),
  public.fn_renotificar_avaliacoes_dispensadas()
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.definir_perfil_publico(boolean),
  public.get_atividade_leitura_anual(uuid),
  public.get_interacoes_diarias(uuid, integer)
TO anon;
```

## Entrega 2 — RPCs de leitura respeitam perfil privado

**Situação:** migração pronta e testada localmente em `supabase/migrations/20261124180000_fase0_privacidade_rpcs_leitura.sql`. **Ainda não aplicada em produção.**

**O que muda:** `get_stats_leitura`, `get_generos_lidos`, `get_livros_por_mes`, `calcular_streak_leitura` e `get_interacoes_diarias` passam a aplicar a regra de `pode_ver_leituras_de`: o dono, um admin ou qualquer pessoa quando o perfil é público. Quem não pode ver recebe zeros ou lista vazia, sem erro. Chamadas com a chave de serviço seguem liberadas. `get_contagem_social` não muda, porque contagem de seguidores não é dado de leitura.

**Impacto hoje:** nenhum perfil está privado em produção (29 perfis, todos públicos), então nenhuma tela muda de comportamento agora. A correção fecha a brecha para quando alguém marcar o perfil como privado.

**Teste em Postgres 16 local**, com as definições de `has_role` e `pode_ver_leituras_de` copiadas de produção:

| Quem chama | Alvo | Resultado |
|---|---|---|
| Usuário comum | perfil público de outra pessoa | dados completos |
| Usuário comum | perfil **privado** de outra pessoa | zeros e listas vazias |
| O próprio dono | seu perfil privado, com e sem parâmetro | dados completos |
| Admin | perfil privado | dados completos |
| Chave de serviço | perfil privado | dados completos |

A `get_stats_leitura` foi reestruturada para avaliar a regra uma única vez; a versão nova devolve exatamente o mesmo resultado da antiga para quem pode ver. A versão antiga devolvia os dados do perfil privado ao usuário comum, o que confirma a brecha.

**Teste de fumaça após aplicar:** abrir o próprio perfil e conferir os números de estatísticas; abrir a tela de leituras e conferir a sequência de dias; abrir o perfil público de outro usuário.

**Reversão:** as funções aceitam `CREATE OR REPLACE`. Basta reaplicar a migração sem as linhas do filtro `pode_ver_leituras_de`.

## Achados que ficam para a próxima entrega

1. ~~Privacidade em RPCs de leitura.~~ Tratado na Entrega 2, acima.
2. **Endpoints de lote abertos.** `reprocessar-generos`, `reprocessar-autores` e `reprocessar-obras` são chamados pelo `pg_cron` sem credencial. Proteger com um segredo de cron no cabeçalho, como já faz `enviar-lembretes-meta`.
3. **`search-books` e `obra-estatisticas`** continuam públicas. São só leitura, mas `search-books` consome cota de APIs externas; avaliar limite de taxa.
4. **Proteção contra senha vazada** é uma chave no painel do Supabase Auth; não é configurável por migração.
5. **`ranking_clube`** (materialized view) segue legível por `anon`.
6. **Erros de tipo antigos** em `_shared/generos.ts` (5 no `deno check`). O arquivo deixou de ser usado pela `rapid-action`; conferir se outra função publicada ainda depende dele.
7. **Desvio entre repo e produção nas demais Edge Functions.** A `rapid-action` estava diferente; as outras ainda não foram conferidas.
