# PROMPT — Implementar onboarding do Namzu (framework Mobbin)

> Cole este prompt no agente (Claude Code / Cursor) **com o repositório `namzu-book-quest` aberto** e o MCP do Supabase conectado. Execute **uma fase por vez**, aguardando minha validação ao fim de cada uma. Não pule a Fase 0.

---

## CONTEXTO

Você vai implementar um fluxo de onboarding novo no Namzu, uma rede social de leitura (alternativa brasileira ao Skoob/Goodreads). A tese, em uma frase: **entregar valor antes de pedir trabalho** — o usuário monta a estante via quiz de gosto e só cria conta quando já tem algo a perder.

**Stack:** Vite + React + TypeScript + React Router + Supabase (Postgres 17, sa-east-1) + Tailwind/shadcn.
**Supabase project:** `qiiuvlmauztjitflqcfd` (confirme no `.env` / `CLAUDE.md`).
**Marca:** navy `#0E2A45` + mint `#5FCF9B`; display **Lora**, corpo **DM Sans**.

**Estado atual a corrigir:** hoje o visitante cai direto em `/login` (via `ProtectedRoute` + `FeatureRoute`), e links de clube perdem a URL de origem ao redirecionar. Esse é o "portão" que vamos inverter — o onboarding precisa ser **rota pública e anônima**.

### Os 8 princípios (régua de aceite de tudo que você fizer)
1. **Mostrar o resultado** — primeira tela é a estante pronta + feed, não cadastro.
2. **Parecer humano** — copy conversacional em PT-BR, não formulário.
3. **Personalização** — quiz de gosto cedo (gêneros, 3 livros, ritmo, objetivo).
4. **Resultado personalizado** — devolve estante + clubes + trilha na hora (endowment).
5. **Paywall depois do valor** — nada de marketplace/premium no onboarding.
6. **Fluxo longo parece curto** — barra de progresso, 1 pergunta/tela, "pular", micro-recompensa.
7. **Ensinar em contexto** — sem tour; dicas na 1ª vez que cada feature é usada.
8. **Pedir na hora certa** — conta na penúltima tela; notificação amarrada a um motivo.

### Fluxo proposto (6 telas)
| # | Tela | Princípios |
|---|------|-----------|
| 1 | "Sua vida de leitor, num lugar só" — estante demo + stats | 1 |
| 2 | Quiz · gêneros (multi-select, barra, pular) | 3, 6 |
| 3 | Quiz · 3 livros que ama (+ micro-recompensa) | 3, 6 |
| 4 | Objetivo (ler mais / descobrir / comunidade) | 2 |
| 5 | "Pronto, montei sua estante" — 12 livros + 3 clubes match + trilha | 4, 8 |
| 6 | Salvar (criar conta) + permissão de notificação contextual | 5, 8 |

---

## FASE 0 — Reconhecimento e governança (NÃO escreva código de feature)

**Objetivo:** entender o terreno antes de tocar em qualquer arquivo.

1. Leia `CLAUDE.md`, `PROJETO-CONTEXTO.md` e `GOVERNANCA-DOCUMENTAL.md` se existirem; siga as convenções deles.
2. Mapeie o roteamento atual: encontre `ProtectedRoute`, `FeatureRoute`, o componente de `/login`, e onde o redirecionamento perde a URL de origem.
3. Liste o design system: tokens de cor, fontes, e componentes de UI reutilizáveis (botão, chip, progress, card).
4. No Supabase, rode `list_tables` (schema `public`) e identifique as tabelas de: gêneros/obras (`obras`, `edicoes`, `autores`), clubes (`clubes`), perfis, e leitura/estante.
5. **Se tiver acesso a navegador**, abra `https://www.namzu.com.br/login` e capture o estado de entrada atual (print). Caso contrário, descreva o fluxo de entrada a partir do código.
6. **Entregue um ADR** (`docs/adr/ADR-XXX-onboarding.md`, no template do projeto) propondo: rota pública `/comecar`, máquina de estado anônimo→autenticado, e gating por feature flag `show_onboarding`. **Pare e aguarde aprovação.**

**Critério de aceite:** relatório do estado atual + ADR proposto. Zero código de feature escrito.

---

## FASE 1 — Modelo de dados (Supabase)

**Objetivo:** persistir gosto, alimentar recomendação e match de clubes.

1. Migration única em bloco `DO $$ ... $$` (atômica), idempotente:
   - Tabela `perfil_preferencias` (`user_id uuid PK/FK auth.users`, `generos text[]`, `livros_amados uuid[]`, `ritmo text`, `objetivo text`, `criado_em timestamptz default now()`).
   - Se `generos` ainda não for entidade, criar tabela `generos` e seed com a lista canônica (Ficção, Fantasia, Não-ficção, Romance, Filosofia, História, Suspense, etc.).
2. Função `SECURITY DEFINER` **`match_clubes_por_gosto(p_generos text[], p_objetivo text)`** → retorna top 3 clubes ordenados por afinidade de gênero/objetivo (use os 10 clubes públicos existentes com seus curadores).
3. Função `SECURITY DEFINER` **`seed_estante_inicial(p_user_id uuid)`** → popula a estante/leitura do usuário com ~12 obras recomendadas a partir de `generos` + `livros_amados` (sem duplicar).
4. **RLS:** cada usuário lê/escreve só as próprias preferências. Funções rodam como definer, mas validam `auth.uid()`.
5. Documente em uma RN (regra de negócio) no template do projeto.

**Critério de aceite:** migration aplicada em branch de dev; as duas funções retornam dados coerentes para um usuário de teste; RLS testada.

---

## FASE 2 — Estado anônimo → autenticado (o ponto crítico)

**Objetivo:** o usuário responde o quiz **sem sessão** e os dados são preservados até o signup.

1. Crie um store de onboarding (Context ou Zustand) com persistência em `localStorage` (`namzu_onboarding`): `generos`, `livrosAmados`, `ritmo`, `objetivo`, `etapaAtual`.
2. Durante o quiz, **nada vai pro Supabase** — só estado local.
3. No signup (Supabase Auth, Google + e-mail), dispare a sequência de **merge** em ordem:
   1. `insert` em `perfil_preferencias` com o estado local;
   2. `rpc('seed_estante_inicial', { p_user_id })`;
   3. `rpc('match_clubes_por_gosto', ...)` e auto-join nos clubes escolhidos;
   4. limpar `localStorage` do onboarding.
4. Tratar reentrada: se o usuário já tem `perfil_preferencias`, pular o quiz e ir pro app.
5. Garantir idempotência (signup interrompido no meio não duplica estante/clubes).

**Critério de aceite:** completar o quiz deslogado, criar conta, e ver estante + clubes populados sem duplicação; recarregar no meio do quiz mantém o progresso.

---

## FASE 3 — UI do onboarding (6 telas)

**Objetivo:** construir o fluxo público em `/comecar`, fiel à marca e aos 6 frames.

1. Rota **pública** `/comecar` com um `<OnboardingStepper>` controlando as 6 telas. Componentes: `TelaResultado`, `QuizGeneros`, `QuizLivros`, `QuizObjetivo`, `TelaEstantePronta`, `TelaCriarConta`.
2. Barra de progresso visível das telas 2–4; botão **"Pular"** sempre disponível; **1 pergunta por tela**.
3. Micro-recompensa concreta após cada resposta (ex.: toast "+2 livros na sua estante ✦").
4. Copy PT-BR exata (use como base, ajuste fino livre):
   - **T1:** título "Sua vida de leitor, num lugar só." · CTAs "Começar" / "Já tenho conta".
   - **T2:** "O que você curte ler?" · "Escolha à vontade. Dá pra mudar depois."
   - **T3:** "3 livros que você ama" · "Pra eu entender seu paladar."
   - **T4:** "O que te traz pro Namzu?" · opções "Ler mais este ano" / "Descobrir livros novos" / "Trocar ideia com gente".
   - **T5:** "Pronto, montei sua estante." · "12 livros, 3 clubes e uma trilha — no seu gosto."
   - **T6:** "Quer guardar sua estante?" · "Crie a conta pra não perder o que montamos." · Google / e-mail.
5. Marca: Lora nos títulos, DM Sans no corpo, navy/mint. Mobile-first. Respeitar `prefers-reduced-motion`, foco de teclado visível.
6. Tela 1 mostra estante demo + stats (princípio 1) usando dados estáticos/seed — **não** exige login.

**Critério de aceite:** as 6 telas navegáveis no mobile, fiéis à marca, com progresso/skip/micro-recompensa; tela 1 acessível sem sessão.

---

## FASE 4 — Derrubar o login wall na entrada

**Objetivo:** inverter o "portão" — explorar antes de logar, sem quebrar o que existe.

1. Tornar `/` (ou landing) e `/comecar` **públicas**; novo visitante sem sessão vai pro onboarding, não pro `/login`.
2. Corrigir o redirecionamento do `ProtectedRoute`: **preservar a URL de origem** (`returnTo`) para que links de clube compartilhados levem o usuário de volta após login — em vez de perder a rota (bug atual).
3. Para deep links de clube sem sessão: mostrar **preview do clube + CTA de onboarding/login** em vez de redirecionamento seco.
4. **Gating:** todo o fluxo novo atrás da feature flag `show_onboarding` (padrão `FeatureRoute`), pra ligar/desligar sem deploy.

**Critério de aceite:** visitante anônimo chega no onboarding; link de clube compartilhado preserva destino após login; flag desliga o fluxo limpo.

---

## FASE 5 — Ensino em contexto + permissões na hora certa

**Objetivo:** princípios 7 e 8 fora do onboarding inicial.

1. Dicas de primeira vez (tooltip/coachmark) disparadas no 1º uso de cada feature: 1ª leitura registrada, 1º clube acessado, 1ª curtida. Rastreie em `localStorage` (`namzu_dicas`) ou tabela `dicas_vistas`.
2. Permissão de notificação **só** quando o usuário segue alguém ou entra num clube ("Avisar quando responderem?"), nunca no início.
3. Cada pedido amarrado a um motivo visível na própria UI.

**Critério de aceite:** nenhuma dica aparece no fluxo inicial; cada dica aparece uma vez, no contexto certo; permissão atrelada à ação.

---

## FASE 6 — Posicionamento de paywall / marketplace

**Objetivo:** princípio 5 — cobrar/vender depois do valor.

1. Garantir que **nada** de marketplace ou premium apareça nas 6 telas de onboarding.
2. Upsell premium (stats avançadas/desafios) só após o "aha" — fora do escopo de UI agora, apenas deixar o gancho documentado.
3. Marketplace aparece **em contexto** (na página do livro), não na entrada.

**Critério de aceite:** onboarding 100% gratuito e sem oferta; gancho de premium documentado em CU/EV.

---

## FASE 7 — QA, acessibilidade e analytics

1. Checklist mapeando **cada um dos 8 princípios** a um critério testável (ex.: "P8: nenhum pedido de conta antes da tela 6").
2. Eventos de analytics por etapa (início, conclusão de cada tela, signup, abandono) pra medir o funil depois.
3. A11y: foco visível, contraste, `prefers-reduced-motion`, navegação por teclado. Mobile e desktop.
4. Testes: quiz anônimo → signup → estante/clubes populados; reentrada de usuário existente; flag on/off.

**Critério de aceite:** checklist dos 8 princípios todo verde; funil instrumentado; build sem regressão no auth existente.

---

## GUARDRAILS (valem em todas as fases)

- **Uma fase por vez**, com pausa pra validação. Não encadeie fases sem aprovação.
- **ADR antes de código** em decisões estruturais; RN/CU/EV no template do projeto.
- **Uma migration por fase**, atômica e idempotente; nunca editar migration já aplicada.
- **Não quebrar** o auth, o roteamento ou as feature flags existentes — tudo novo atrás de `show_onboarding`.
- Copy em **PT-BR**, sentence case, voz ativa.
- Confirme nomes reais de tabelas/rotas/componentes **lendo o repo** — os nomes aqui são guia, não verdade absoluta.
- Ao terminar cada fase, entregue: o que mudou, arquivos tocados, e como testar.
