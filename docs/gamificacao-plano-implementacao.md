# Plano de Implementação — Renovação da Gamificação Namzu

> Este documento substitui o diagnóstico do `docs/gamificacao-proposta.md` nos pontos em que a inspeção real do banco (Supabase, projeto `qiiuvlmauztjitflqcfd`) mostrou informação diferente do que foi assumido a partir da leitura de código. Onde os dois documentos não conflitam, o conteúdo teórico (Octalysis, SDT, Hooked Model, Fogg) do documento anterior continua válido e não é repetido aqui.

**Decisões já travadas com Paulo** (não estão mais em aberto):

| Decisão | Escolha |
|---|---|
| Cadência da liga/temporada de clube | Semanal |
| Como ganhar "congelador de sequência" | Por marco de dias consecutivos (automático) |
| Toggle de gamificação de clube | Feature flag global em `app_settings` (`show_gamificacao_clube`) |
| Redesenho visual | Mantém paleta Namzu (navy `#1A3B8B`, mint `#D1F2E5`, Inter/Fraunces); redesenha componentes |

**Autorização permanente registrada:** Paulo autorizou explicitamente apagar tabelas, colunas, telas e código obsoleto ao longo deste plano, sem precisar pedir confirmação a cada exclusão. A única exceção continua valendo: **antes de criar uma tabela nova, confirmo o nome com Paulo** (regra já registrada em memória, de uma conversa anterior). Exclusões não precisam de confirmação prévia; criações de tabela, sim.

---

## Fase 0 — Diagnóstico corrigido (o que existe de verdade hoje)

Isto não é teoria — é o que a inspeção direta do Postgres mostrou. É a base de tudo que vem depois.

### 0.1 Existem DOIS motores de XP paralelos, não um

Eu tinha descrito a gamificação como "lógica espalhada no cliente". Isso está errado. Existem dois motores **server-side**, construídos em momentos diferentes, que nunca foram unificados:

**Motor A — `conceder_xp(p_user_id, p_xp, p_acao, p_ref_id)`**
- Acionado por 3 triggers: `trg_gamificacao_livro_concluido` (em `usuario_livros`, +50 XP ao concluir livro), `trg_gamificacao_insight` (em `leitura_pos`, +20 XP ao registrar reflexão pós-leitura), `trg_gamificacao_streak` (em `gamificacao_perfis`, desbloqueia conquistas de consistência).
- Fórmula de nível: geométrica — `xp_proximo_nivel *= 1.5` a cada nível, em loop (permite múltiplos níveis de uma vez).
- Mantém `streak_atual`/`streak_maximo` em `gamificacao_perfis`.
- **Não** chama `refresh_ranking()`.

**Motor B — `dar_xp(p_user_id, p_acao, p_xp, p_ref_id, p_clube_id)`**
- Acionado por 1 único trigger: `trg_concluir_livro` em `clube_progresso` (a tabela que rastreia o progresso de leitura **dentro de um clube**), +100 XP ao concluir.
- Fórmula de nível: linear — `nivel = floor(xp_total / 100) + 1`. **Diferente e incompatível** com a fórmula geométrica do Motor A.
- Grava `clube_id` em `gamificacao_xp_log` (Motor A nunca grava `clube_id`).
- **Chama `refresh_ranking()`** a cada execução — esta é a única coisa que atualiza a materialized view `ranking_clube`.
- Hoje responde por ~62% dos registros de XP no banco (18 de 29 linhas em `gamificacao_xp_log` têm `clube_id` preenchido), então não é um caminho morto — é o caminho **dominante** para quem lê em clube, só que despenca em divergência com o Motor A.

**Consequência prática:** um usuário que conclui um livro **dentro de um clube** aciona os dois motores ao mesmo tempo (a atualização em `usuario_livros` e em `clube_progresso` tendem a acontecer juntas) — ganha 100 XP pelo Motor B *e* 50 XP pelo Motor A para o mesmo evento de "terminei este livro", e o campo `nivel` fica com o resultado de **qual dos dois rodou por último**, porque cada motor usa uma fórmula diferente de cálculo de nível sobre a mesma coluna `xp_total`. Isso não é uma hipótesy — é o estado atual do banco de produção.

### 0.2 Um achievement está silenciosamente quebrado

`trg_concluir_livro` (Motor B) tenta conceder o achievement `'primeiro_livro'` — mas **esse código não existe** na tabela `conquistas`. O código real é `'leitura_1'` ("Primeiro Livro"). Como o INSERT usa um `SELECT ... WHERE codigo = 'primeiro_livro'`, a subquery sempre retorna vazio e a inserção é um no-op silencioso — sem erro, sem log, simplesmente nunca acontece. Quem completa o primeiro livro via fluxo de clube nunca recebe esse achievement por esse caminho (só recebe se o Motor A também disparar `leitura_1` corretamente, o que hoje acontece em paralelo — mas é sorte de desenho, não intenção).

### 0.3 `ranking_clube` é uma materialized view que só é atualizada pelo Motor B

`ranking_clube` é `MATERIALIZED VIEW`, não `VIEW`. Não existe nenhum cron job (`cron.job` tem só 4 jobs, nenhum relacionado a gamificação) nem trigger que rode `REFRESH MATERIALIZED VIEW ranking_clube` de forma independente — a única chamada existente está **dentro do Motor B** (`dar_xp` → `perform refresh_ranking()`). Isso significa que XP ganho por insight, streak, ou conclusão de livro fora do contexto de clube (Motor A) nunca atualiza o ranking. O hook `useRankingClube.ts` provavelmente recalcula no cliente porque, na prática, a view fica defasada para qualquer XP que não passou pelo Motor B.

### 0.4 Missões não têm nenhuma automação no banco

A tabela `usuario_missoes` (`user_id`, `missao_id`, `progresso_atual`, `concluida`, `concluida_em`) existe, assim como `missoes` (com `meta_valor`, `meta_acao`, `xp_recompensa`, janela `ativo_de`/`ativo_ate`). **Nenhuma função ou trigger no banco escreve nelas.** Confirmei isso buscando por `usuario_missoes` no corpo de todas as funções do schema `public` — zero ocorrências. Isso quer dizer que, se existe alguma tela de missões funcionando hoje, ela está sendo inteiramente recalculada no cliente (`useMissoesDiarias.ts`), sem persistência real de progresso no servidor.

### 0.5 A categoria de achievements "comunidade" nunca é desbloqueada

`comunidade_1`, `comunidade_50`, `comunidade_500` existem na tabela `conquistas` (50/500/2000 XP) mas nenhum trigger ou função do banco referencia `desbloquear_conquista` para esses códigos. São badges mortos no catálogo — visíveis na UI (se houver tela que lista conquistas), mas impossíveis de conquistar.

### 0.6 Duas fórmulas de streak independentes

Já documentado na proposta original e confirmado: `calcular_streak_leitura(_user_id)` (RPC, recalcula olhando datas distintas em `leitura_progresso`) e `streak_atual`/`streak_maximo` (colunas mantidas pelo Motor A, `conceder_xp`) são dois cálculos que podem divergir — não compartilham código.

### 0.7 O que isso muda na estratégia

A boa notícia: **não estamos partindo do zero**. Já existe um motor de XP/conquistas server-side razoavelmente bem desenhado (Motor A: `conceder_xp` + 3 triggers + dedupe diário por `(user_id, acao, referencia_id, data)`). A estratégia correta não é "construir um motor novo", é: **unificar os dois motores em um só, corrigir os bugs encontrados, e então estender esse motor único com as mecânicas novas** (streak freeze, raridade, liga semanal, XP de clube). Construir por cima de dois motores divergentes seria multiplicar a dívida técnica.

---

## Fase 1 — Unificação do motor de XP (pré-requisito de tudo)

**Objetivo:** um único caminho para conceder XP, com uma única fórmula de nível, sempre atualizando o que precisa ser atualizado.

1. Adotar a fórmula geométrica do Motor A (`conceder_xp`) como única fonte de verdade — é a mais alinhada com curvas de progressão de apps de hábito (cada nível pede um pouco mais que o anterior, mantendo a sensação de avanço sem trivializar níveis altos).
2. Reescrever `conceder_xp` para aceitar `p_clube_id uuid DEFAULT NULL` (assim ele grava contexto de clube em `gamificacao_xp_log` quando aplicável, função que hoje só o Motor B faz) e para chamar `refresh_ranking()` (ou seu substituto da Fase 3 — ver nota abaixo) sempre que `p_clube_id` não for nulo.
3. Apontar `trg_concluir_livro` (hoje chama `dar_xp`) para chamar `conceder_xp` com o `clube_id` do registro de `clube_progresso`.
4. Corrigir o bug do achievement: trocar `'primeiro_livro'` por `'leitura_1'` — ou, melhor, **remover esse desbloqueio manual inteiramente** e deixar o Motor A (via `trg_gamificacao_livro_concluido`) ser o único responsável por `leitura_1`, já que ele já faz isso corretamente. Isso elimina a duplicação de responsabilidade entre dois triggers diferentes para o mesmo achievement.
5. Decidir e unificar o streak: manter `streak_atual`/`streak_maximo` (colunas, mantidas pelo Motor A) como fonte de verdade; `calcular_streak_leitura` passa a ser usado apenas como ferramenta de auditoria/recalculo manual, não como fonte de leitura da UI.
6. Apagar `dar_xp` depois que `trg_concluir_livro` for repontado — autorizado, sem necessidade de nova confirmação (função obsoleta, não tabela).

**Padrão arquitetural aplicado:** isso é essencialmente um **Strategy** disfarçado de função SQL — diferentes "ações" (`livro_concluido`, `insight_registrado`, `concluir_livro_clube`, futuramente `missao_concluida`) compartilham a mesma interface de concessão de XP. Não vale a pena introduzir uma camada de classes/Strategy em TypeScript para isso — a centralização já dentro de uma função Postgres bem testada é a solução mais simples que resolve o problema (YAGNI: não criar abstração de aplicação para algo que o banco já centraliza bem).

---

## Fase 2 — Schema novo necessário para as mecânicas decididas

Nomes propostos abaixo — **preciso da sua confirmação antes de criar qualquer tabela nova** (colunas novas em tabelas existentes têm risco bem menor, mas também vou listar para visibilidade).

### 2.1 Streak freeze (ganho por marco de dias)
Colunas novas em `gamificacao_perfis`:
- `streak_freezes_disponiveis integer DEFAULT 0`
- `streak_freezes_usados_total integer DEFAULT 0`

Lógica: ao atingir marcos de streak (ex.: 7, 30, 100 dias — mesmos marcos dos achievements de consistência), o motor unificado credita 1 freeze. Quando o usuário perde um dia de leitura, antes de zerar `streak_atual`, o motor verifica `streak_freezes_disponiveis > 0`; se sim, consome 1 freeze e mantém o streak intacto em vez de resetar.

### 2.2 Raridade de conquistas
Coluna nova em `conquistas`:
- `raridade text DEFAULT 'comum'` (`comum`, `rara`, `epica`, `legendaria` — confirmar nomenclatura)

Permite hierarquia visual (cores/badges diferentes) sem mudar a lógica de desbloqueio.

### 2.3 Liga semanal de clube
Tabela nova proposta: **`clube_temporadas_ranking`** *(nome a confirmar com Paulo antes de criar)*
- `id uuid`, `clube_id uuid`, `semana_inicio date`, `semana_fim date`, `user_id uuid`, `xp_na_semana integer`, `posicao integer`

Em vez de depender de uma materialized view global (`ranking_clube`) que só reflete o XP acumulado total, a liga semanal precisa de um corte por período — isso é melhor resolvido com uma tabela real (populada incrementalmente a cada concessão de XP com `clube_id`) do que com uma materialized view, porque materialized views não fazem bem "ranking da semana corrente" sem reprocessar tudo. Isso também resolve o problema de frescor da Fase 0.3: dados gravados direto por evento, sem depender de refresh.

`ranking_clube` (a materialized view antiga, de XP acumulado total por clube) pode ser **mantida** como "ranking histórico geral do clube" ou **removida** se Paulo decidir que só a liga semanal importa — decisão a confirmar, não é destrutiva por padrão até decidirmos.

### 2.4 XP agregado por clube (não apenas ranking entre membros)
Tabela nova proposta: **`clube_gamificacao`** *(nome a confirmar)*
- `clube_id uuid PRIMARY KEY`, `xp_total integer DEFAULT 0`, `nivel integer DEFAULT 1`, `xp_proximo_nivel integer DEFAULT 100`, `updated_at timestamptz`

Soma do XP de todos os membros gerado em contexto daquele clube (toda vez que o motor unificado concede XP com `clube_id` preenchido, soma também aqui). Isso é o "nível do clube" em si — distinto do ranking interno entre membros.

### 2.5 Feature flag
Nova chave em `app_settings`: `show_gamificacao_clube` (boolean, default `false` até a Fase 4 estar validada). Seguindo exatamente o padrão existente (`FeatureFlagKey` em `src/hooks/useFeatureFlags.ts` + `DEFAULTS`) — sem necessidade de tabela nova, `app_settings` já é genérica.

---

## Fase 3 — Motor de missões (hoje 100% morto no servidor)

**Decisão de arquitetura:** estender o motor unificado da Fase 1 com um trigger genérico que, a cada concessão de XP (`acao`), verifica se existe alguma `missao` ativa (`ativo_de <= hoje <= ativo_ate`) cujo `meta_acao` bate com a `acao` recebida, incrementa `progresso_atual` em `usuario_missoes`, e marca `concluida = true` + concede `xp_recompensa` quando `progresso_atual >= meta_valor`.

Isso é um **Observer/Domain Event** dentro do próprio Postgres: a concessão de XP é o evento de domínio (`XpConcedido`), e a atualização de missão é uma reação a esse evento — coerente com o padrão Domain Events já priorizado nas diretrizes do projeto, só que implementado como trigger SQL em vez de fila de eventos em aplicação (correto para este estágio: Modular Monolith, sem necessidade de infraestrutura de mensageria ainda — YAGNI).

---

## Fase 4 — Gamificação de clube + toggle admin

1. Função/trigger que credita `clube_gamificacao.xp_total` sempre que XP é concedido com `clube_id`.
2. View ou query agregada para a liga semanal (lendo `clube_temporadas_ranking`), com corte automático toda semana (job agendado via `pg_cron`, mesmo padrão já usado pelos 4 jobs existentes de reprocessamento).
3. Tela/seção de "Gamificação do Clube" no frontend, envolvida em `<FeatureRoute flag="show_gamificacao_clube">` (ou renderização condicional, já que é uma seção dentro de uma página existente, não uma rota nova).
4. Toggle no painel admin (`AdminRoute`) para ativar/desativar `show_gamificacao_clube` — reaproveitando a tela de admin de feature flags já existente, se houver, ou criando o controle equivalente a ela.

---

## Fase 5 — Renovação visual

Paleta mantida (navy `#1A3B8B`, mint `#D1F2E5`, Inter/Fraunces). Componentes a redesenhar: cartão de progresso de XP/nível, modal de celebração de conquista, badges de conquista (incorporando raridade da Fase 2.2), cartão de ranking de clube/liga semanal, indicador de streak + streak freeze.

---

## Fase 6 — Limpeza (autorizado a executar sem nova confirmação)

- Apagar `dar_xp` após a Fase 1.
- Remover a recomputação client-side de missões em `useMissoesDiarias.ts` assim que o motor server-side da Fase 3 estiver validado, passando o hook a apenas ler `usuario_missoes`.
- Remover o mapa hardcoded `META_POR_CODIGO` (duplicava metas de achievement que já existem em `conquistas.meta_valor`/categoria) assim que o frontend passar a ler a meta diretamente da tabela.
- Decidir e, se for o caso, remover `ranking_clube` (materialized view antiga) em favor da liga semanal — ou mantê-la como histórico, conforme decisão da Fase 2.3.
- Remover qualquer tela/rota de gamificação que se torne redundante após o redesenho (a confirmar quais, conforme o trabalho avançar).

---

## Fase 7 — Validação

- Conferir, por amostragem em `gamificacao_xp_log`, que cada conclusão de livro gera **exatamente um** registro de XP (não mais dois).
- Conferir que `leitura_1` é concedido corretamente tanto fora quanto dentro de contexto de clube.
- Conferir que a liga semanal zera/corta corretamente na virada de semana.
- Conferir que o toggle de admin realmente esconde/mostra a seção de gamificação de clube sem afetar gamificação individual.
- Gerar `supabase gen types typescript` ao final de cada fase de schema, para manter `src/integrations/supabase/types.ts` sincronizado (nunca editar manualmente, conforme `CLAUDE.md`).

---

## Riscos técnicos a monitorar

- **Sincronização de migrations local vs. remoto:** as migrations de gamificação já aplicadas no remoto (`fase2_gamificacao_triggers`, `fix_gamificacao_xp_log_acao_check`) não têm arquivo correspondente em `supabase/migrations/` no repositório local. Antes de aplicar qualquer migration nova, vale alinhar isso para não perder histórico.
- **Dados de produção já gravados pelos dois motores:** ao unificar (Fase 1), os registros antigos em `gamificacao_xp_log` vão continuar com fórmulas/contextos diferentes — não vamos reescrever histórico, só passamos a gravar de forma consistente a partir da migration.
- **`refresh_ranking()` síncrono dentro de `conceder_xp`:** está ok em volume atual, mas se o clube crescer muito, um `REFRESH MATERIALIZED VIEW CONCURRENTLY` a cada concessão de XP pode ficar caro — a Fase 2.3 (tabela de liga semanal escrita incrementalmente) já evita esse problema para a liga; vale considerar se `ranking_clube` (XP total histórico) ainda precisa ser refresh-on-write ou pode virar refresh agendado via `pg_cron`.

---

## Sequência recomendada de execução

1. Fase 1 (unificação do motor) — maior risco de regressão, mas todo o resto depende dela.
2. Fase 2 (schema novo) — com confirmação de nomes antes de criar tabelas.
3. Fase 3 (missões) — reaproveita o motor já unificado.
4. Fase 4 (clube + admin toggle) — pedido explícito do Paulo, prioridade alta.
5. Fase 5 (visual) — pode rodar em paralelo com 3/4 depois que os dados estiverem confiáveis.
6. Fase 6 (limpeza) — ao final de cada fase anterior, não tudo de uma vez.
7. Fase 7 (validação) — contínua, não só no final.
