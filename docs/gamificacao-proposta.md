# Proposta: Nova Gamificação do Namzu

**Status:** documento de discussão (sem implementação ainda)
**Autor:** Paulo Roberto Moura + Claude (PO/PM/UX/Arquiteto)
**Data:** 2026-06-24

> Nota de transparência: não foi possível acessar o conteúdo do vídeo de referência (YouTube bloqueou o scraping). Esta proposta usa frameworks consagrados de gamificação (Octalysis, Self-Determination Theory, Hooked Model, Fogg Behavior Model) que tipicamente sustentam esse tipo de conteúdo, cruzados com o código real do Namzu.

---

## 1. Contexto

O Namzu já tem um sistema de gamificação funcional: XP, nível, streak de leitura, missões diárias/mensais, conquistas e ranking por clube. O objetivo desta proposta não é começar do zero, e sim evoluir o que existe para se aproximar dos padrões que mais retêm usuário em apps de hábito (leitura, fitness, idiomas), corrigindo ao mesmo tempo uma dívida arquitetural identificada na leitura do código.

## 2. Diagnóstico do sistema atual

Lendo o repositório `namzu-book-quest`, encontrei duas categorias de problema: motivacional (o que falta para engajar) e arquitetural (como está construído).

### 2.1 O que já existe e funciona

- `gamificacao_perfis`: xp_total, nivel, xp_proximo_nivel, streak_atual, streak_maximo.
- `gamificacao_xp_log`: log de eventos de XP (acao, xp_ganho, referencia_id, clube_id) — já é, na prática, um event log de auditoria.
- `missoes` (diárias/mensais) e `conquistas`, com RPC `calcular_streak_leitura`.
- Realtime: toast de conquista desbloqueada via `usuario_conquistas`.
- Ranking por clube (top 5 + posição própria) combinando XP e streak.

### 2.2 Achado importante: infraestrutura morta

Existem pelo menos **duas peças de backend já construídas e não usadas pelo frontend**:

- A tabela `usuario_missoes` (progresso_atual, concluida, concluida_em por usuário/missão) existe no schema, mas `useMissoesDiarias.ts` ignora-a completamente e recalcula o progresso do zero, a cada carregamento, varrendo `leitura_progresso`, `leitura_conteudo`, `leitura_citacoes` e `clube_posts`.
- A view `ranking_clube` (clube_id, user_id, xp_total, streak_atual, nivel, posicao) existe no banco, mas `useRankingClube.ts` reimplementa a mesma lógica no client com 4 queries separadas.

Isso é sintoma de que o backend evoluiu (alguém criou essas peças) mas o frontend não foi atualizado para consumi-las — ou foram criadas e a integração nunca foi finalizada. De qualquer forma, antes de adicionar mecânica nova, vale resolver isso: é o "low hanging fruit" arquitetural desta proposta.

### 2.3 Outros pontos arquiteturais

- As metas de conquista (`META_POR_CODIGO`) estão hardcoded em `useProximaConquista.ts` no frontend, duplicando o que deveria estar no banco — um admin não consegue ajustar uma meta sem deploy.
- Cada card de gamificação dispara de 3 a 7 chamadas Supabase por carregamento (sem agregação server-side), o que não escala e contraria a diretriz de cache-first já adotada no projeto para catálogo.
- O schema de gamificação (tabelas, view, RPC) não aparece em nenhum arquivo de `supabase/migrations/` do repositório — ou seja, foi criado fora do controle de versão. Isso é risco operacional (ninguém consegue recriar o ambiente a partir do histórico de migrations).

### 2.4 Lacunas motivacionais (frente à teoria)

- **Recompensa 100% determinística.** Todo XP é fixo e previsível — não há "recompensa variável" (o gatilho mais citado em apps com alta retenção).
- **Streak sem rede de segurança.** Perder um dia zera tudo; não existe "congelar streak".
- **Sem celebração de level-up.** `nivel` existe no perfil, mas não há nenhum momento de marco na UI.
- **Missões sempre as mesmas 3.** Falta variedade e personalização (autonomia, na lente da Self-Determination Theory).
- **Ranking sem temporada.** É cumulativo para sempre — quem entrou depois nunca alcança o topo, o que desmotiva em vez de engajar.

## 3. Princípios orientadores

A proposta segue quatro frameworks, escolhidos por serem os que mais aparecem em análises de "o que funciona" em apps gamificados:

1. **Octalysis (Yu-kai Chou)** — cobrir os 8 motivadores centrais, com foco nos que o Namzu ainda não usa: imprevisibilidade/curiosidade, posse, escassez/impaciência.
2. **Self-Determination Theory** — preservar autonomia (usuário escolhe seus desafios), competência (progresso visível) e pertencimento (clube, ranking de grupo pequeno).
3. **Hooked Model (Nir Eyal)** — fortalecer a etapa de "recompensa variável", hoje ausente.
4. **Endowed progress / efeito Zeigarnik** — toda barra de progresso nova deve começar com algum avanço percebido, e todo marco deve ter celebração visual.

Um princípio adicional, não-negociável: nenhuma mecânica deve depender de **perda financeira ou ansiedade artificial** (dark patterns). Streak freeze, por exemplo, deve ser ganho por engajamento, não vendido como item pago de "ansiedade".

## 4. Mecânicas propostas

### 4.1 Recompensa variável em conquistas e missões concluídas

Ao concluir uma missão ou conquista, em vez de só creditar o XP fixo anunciado, há uma chance pequena (ex.: 15%) de um "bônus surpresa": XP extra, um cosmético de perfil, ou destaque temporário no ranking do clube. O valor anunciado nunca diminui — o bônus é sempre upside, nunca uma surpresa negativa.

### 4.2 Streak freeze (proteção de sequência)

Ao atingir certos marcos de streak (ex.: 7, 30 dias), o usuário ganha 1 "congelador de sequência", que perdoa automaticamente um dia perdido. Resolve a fragilidade do streak atual sem criar punição — é recompensa por consistência passada protegendo o futuro.

### 4.3 Level-up com celebração e marcos

Quando `nivel` sobe, exibir uma celebração (similar ao toast de conquista já existente via Realtime) e, em níveis múltiplos de 5, desbloquear algo tangível (cosmético de perfil, destaque no clube, ou acesso antecipado a um recurso). Hoje esse momento simplesmente não existe na UI.

### 4.4 Missões com rotação e personalização

Expandir o catálogo de missões diárias além das 3 fixas atuais, com seleção rotativa (ex.: 3 de um pool de 8–10, sorteadas por dia) e, eventualmente, deixar o usuário escolher seu "foco da semana" (ex.: priorizar leitura vs. comunidade) — atende autonomia da SDT.

### 4.5 Conquistas com raridade

Adicionar um campo de raridade (comum / rara / épica / lendária) — visualmente diferenciado — em vez de tratar todas as conquistas com o mesmo peso visual. Reforça "posse" e "escassez" do Octalysis.

### 4.6 Ranking por temporada (liga)

Em vez de XP acumulado para sempre, o ranking do clube exibido na home passa a refletir uma janela (ex.: mensal), com o acumulado histórico preservado em outro lugar (perfil/estatísticas). Isso cria recorrência (todo mês é uma nova chance) e evita desistência de quem está atrás no acumulado vitalício.

## 5. Arquitetura proposta

A motivação arquitetural central desta proposta: **mover a decisão de "o que conceder e quando" do frontend para um módulo de domínio único no backend**, hoje espalhada em hooks React que recalculam tudo a cada render.

### 5.1 Padrões recomendados (e por quê)

- **Domain Events + Observer.** Toda ação relevante (registrar progresso de leitura, publicar no clube, criar citação) publica um evento de domínio (`AtividadeRegistrada`). O módulo de gamificação escuta esses eventos e decide, de forma centralizada, se algo deve ser concedido (XP, progresso de missão, conquista). Isso desacopla "ler um livro" de "saber que ler um livro dá XP" — hoje esse conhecimento está implícito e duplicado em cada hook.
- **Service Layer (`GamificacaoService`).** Um serviço único concentra as regras de XP, nível, streak, missões e conquistas. Os hooks do frontend passam a chamar uma única função agregadora, não 5–7 queries cada.
- **Strategy Pattern para avaliação de categorias.** Hoje `useProximaConquista.ts` tem uma cadeia de `if/else` por categoria (leitura, consistência, conhecimento, comunidade). Trocar por uma estratégia por categoria (`LeituraStrategy`, `ConsistenciaStrategy`, etc.) deixa o sistema extensível sem tocar em código existente ao adicionar uma 5ª categoria.
- **Repository Pattern.** Acesso a `gamificacao_perfis`, `missoes`, `conquistas` etc. passa por repositórios dedicados, não por chamadas Supabase soltas espalhadas pelos hooks — facilita testar a lógica de negócio isolada do acesso a dados.
- **Cache-first.** Uma view agregada (`vw_resumo_gamificacao`, sucessora do `ranking_clube` hoje não usado) alimenta os cards da home com `staleTime` alto, em linha com o padrão já adotado para catálogo de livros.

Justificativa de trade-off: isso é mais peças do que o atual "cada hook se vira", mas o atual já está no limite — qualquer mecânica nova (streak freeze, raridade, temporada) precisaria de mais if/else e mais round-trips se mantida a abordagem atual. Não estou propondo microsserviços ou Event Sourcing completo — um monólito modular com um event bus interno (mesmo que via trigger de Postgres + tabela de eventos) resolve o problema sem complexidade desproporcional ao tamanho do time.

### 5.2 Diagrama textual dos componentes

```
Ação do usuário (ler, postar, citar, completar livro)
        │
        ▼
Feature module (leitura / clubes / avaliacoes)
        │  publica evento de domínio
        ▼
┌─────────────────────────────────────────────┐
│           Módulo Gamificação (domínio)        │
│                                                │
│  Observer: GamificacaoEventListener           │
│        │                                      │
│        ▼                                      │
│  GamificacaoService (Service Layer)           │
│        │                                      │
│   ┌────┴─────────────┬──────────────┐         │
│   ▼                  ▼              ▼         │
│ XpEngine        MissaoStrategy   ConquistaStrategy
│ (XP/nível/      (por categoria)  (por categoria)
│  streak/freeze)                                │
│        │                  │              │     │
│        ▼                  ▼              ▼     │
│         Repositories (gamificacao_perfis,       │
│         usuario_missoes, usuario_conquistas,    │
│         gamificacao_xp_log)                     │
└─────────────────────────────────────────────┘
        │  Realtime (postgres_changes)
        ▼
Frontend: hooks finos (useGamificacaoResumo)
        │
        ▼
Cards da Home (streak, missões, conquistas, ranking)
```

## 6. Modelo de dados — evolução (sem DDL completo)

Reaproveitar o que existe, com estas adições conceituais:

- `gamificacao_perfis`: adicionar `streak_freezes_disponiveis` (int).
- `conquistas`: adicionar `raridade` (enum: comum/rara/epica/lendaria) e `meta_valor`/`meta_categoria` explícitos — eliminando o `META_POR_CODIGO` hardcoded do frontend.
- `usuario_missoes`: passar a ser a fonte de verdade do progresso (escrita pelo `GamificacaoService`, não recalculada no client).
- Nova tabela `gamificacao_temporadas` (ou reaproveitar `ranking_clube` com filtro de período): janela de ranking mensal, com encerramento e "campeão do mês" arquivado.
- `gamificacao_xp_log` ganha um campo `bonus_surpresa` (boolean) para registrar quando a recompensa variável foi acionada — importante para depois medir se a mecânica está funcionando.

## 7. Riscos técnicos

- **Migração de dados sem regressão.** Como o schema de gamificação não está em migrations versionadas, o primeiro passo seguro é "exportar" o estado atual para uma migration formal antes de alterá-lo — senão qualquer rollback é manual e arriscado.
- **Custo de refatorar hooks existentes.** `useMissoesDiarias`, `useProximaConquista` e `useRankingClube` precisam ser reescritos para consumir o novo serviço — risco de regressão visual se não houver testes de UI antes/depois.
- **Recompensa variável mal calibrada** pode parecer arbitrária ou "injusta" se a taxa de bônus for muito baixa ou muito visível sem explicação — precisa de copy clara ("toda missão pode trazer uma surpresa").
- **Ranking por temporada exige decisão de produto** sobre o que acontece com o XP acumulado histórico (perfil ainda mostra tudo? Só o ranking do clube é reiniciado?) — isso afeta a percepção de "perder progresso", que é justamente o que queremos evitar.
- **Performance de triggers/Observer no Postgres** em escala: se cada ação de leitura disparar trigger síncrono, picos de uso podem gerar latência perceptível. Vale considerar processamento assíncrono (fila leve ou Edge Function) desde o início.

## 8. Sugestões de evolução futura

- Gamificação do clube como entidade própria (XP de clube agregando XP dos membros, "nível do clube").
- Missões geradas dinamicamente por IA com base no perfil de leitura do usuário (em vez de catálogo fixo).
- Cosméticos de perfil (molduras, selos) como mecanismo de "posse" sem custo de desenvolvimento de item shop completo.
- Eventos sazonais (ex.: desafio de verão) usando a mesma infraestrutura de temporada do ranking.
- Painel admin para configurar taxa de recompensa variável e thresholds de streak freeze sem deploy (hoje já há `ConquistasTab`; precisaria de uma aba equivalente para essas novas variáveis).

## 9. Perguntas abertas para o debate

1. Topamos reescrever os 3 hooks (`useMissoesDiarias`, `useProximaConquista`, `useRankingClube`) para usar o `usuario_missoes`/`ranking_clube` já existentes como primeiro passo, antes de qualquer mecânica nova?
2. Ranking por temporada mensal é o intervalo certo, ou semanal engajaria mais dado o perfil de uso do Namzu?
3. Streak freeze: ganho por marco de dias (proposto) ou disponível desde o início com cooldown?
4. Vale formalizar o schema de gamificação em uma migration agora, mesmo antes de mudar regras de negócio, só para eliminar o risco operacional?
