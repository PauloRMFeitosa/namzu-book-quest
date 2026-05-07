# Plano — Experiência Social dos Clubes (faseado)

Decisões fixadas:
- **Sem clubes pagos / monetização** — esconder qualquer UI de preço/receita.
- **Editor markdown leve** (textarea + `react-markdown`, com botões para negrito/itálico/citação/spoiler).
- **Sem canais de voz** — apenas texto.

Execução **fase a fase**. Cada fase é um entregável testável. Começo pela Fase 1 assim que aprovar.

---

## Estado atual

- `src/pages/Clubes.tsx` já tem listagem + detalhe simples — será refatorado, não descartado.
- Várias tabelas existem **sem RLS** (`clube_membros`, `clube_canais`, `clube_threads`, `clube_conteudos`, `microgrupos`, `eventos`, `clube_post_curtidas`, `clube_progresso`, `clube_trilhas`, `evento_participantes`, `microgrupo_membros`, `clube_tags`, etc.). Vou adicionar políticas conforme cada fase tocar a tabela.
- Stack já tem: shadcn completo, Tanstack Query, Tailwind tokens. **Faltam:** `zustand`, `framer-motion`, `react-markdown`.

---

## Fase 1 — Design system editorial + Marketplace `/clubes`

- Tokens novos em `index.css` + `tailwind.config.ts`: paleta quente literária (HSL semântico), tipografia hierárquica (serif p/ títulos, sans p/ corpo), sombras suaves.
- `MarketplaceClubes`: busca, filtros por categoria (chips), seções **Em Alta / Novos / Mais Profundos / Mais Ativos / Pequenos Clubes / Para Você**.
- `ClubeCard` premium: capa, nome, descrição, membros, score engajamento (de `clube_metricas`), creator, tags, hover lift, motion.
- Hook `useClubes({ filtros, secao })`.
- Skeletons + empty states.

**DB/RLS:** SELECT público em `clube_metricas`, `clube_tags`, `tags`. Adicionar `categoria` em `clubes` (ou via `clube_tags`).

---

## Fase 2 — Página do Clube `/clubes/:id` (shell + tabs + sidebar)

- `ClubeHeader` (capa, avatar, nome, creator, membros, descrição, Entrar/Sair, compartilhar — **sem badge pago**).
- Tabs: Feed · Leituras · Canais · Eventos · Membros · Conteúdos · Microgrupos.
- Sidebar direita: progresso coletivo, ranking top 5, próximos eventos, streak coletivo.
- Hooks: `useClube`, `useClubeMembership`, `useEntrar/Sair`.

**DB/RLS:** políticas em `clube_membros` + função security definer `is_clube_membro(_user, _clube)`.

---

## Fase 3 — Feed Social (Reddit/Threads moderno)

- `FeedClube` com tipos de post (`insight | reflexao | citacao | pergunta | progresso | teoria | recomendacao`), reactions, replies (`parent_post_id`), quote, salvar, fixar, destacar (curador).
- `CriarPostDialog` — markdown leve com toolbar (negrito/itálico/cita/spoiler), seletor de tipo.
- `react-markdown` + sanitização para render.

**DB/RLS:** coluna `tipo` em `clube_posts`; nova tabela `clube_post_salvos`; políticas em `clube_post_curtidas`; reativar UPDATE/DELETE em `clube_posts` para autor + admin.

---

## Fase 4 — Leituras do Clube `/clubes/:id/leituras`

- Trilha (`clube_trilhas`) com timeline + checkpoints.
- Progresso individual (`clube_progresso`) + barra coletiva agregada + heatmap semanal.
- Comentar capítulo, marcar citação (vincular `leitura_citacoes`).

**DB/RLS:** políticas em `clube_trilhas` e `clube_progresso`.

---

## Fase 5 — Canais (Discord-like, **só texto**)

- 3 colunas: lista canais (`clube_canais`) | mensagens (`clube_mensagens` via `clube_threads`) | membros online (`user_presence` + Realtime).
- Threads, replies, emoji reactions (`reacoes`), fixar, indicador de digitação (broadcast), presença.
- Zustand store p/ canal selecionado, drafts, scroll.
- Virtualização opcional (`@tanstack/react-virtual`).

**DB/RLS:** políticas completas em `clube_canais`, `clube_threads`, `clube_mensagens`, `reacoes`, `user_presence`. Habilitar Realtime nessas tabelas.

---

## Fase 6 — Eventos `/clubes/:id/eventos`

- Calendário mensal + lista futura/passada, cards modernos.
- RSVP via `evento_participantes`, lembretes via `notificacoes`.
- Tipos: live, workshop, autor convidado, sprint leitura, presencial.
- Criar evento (curador/admin).

**DB/RLS:** políticas em `eventos` e `evento_participantes`.

---

## Fase 7 — Microgrupos

- Listar/criar/entrar (limite de membros), feed privado interno.
- Matchmaking simples por interesses comuns (`perfil_interesses`).

**DB/RLS:** políticas em `microgrupos`, `microgrupo_membros`.

---

## Fase 8 — Creator Dashboard `/creator/dashboard` + Gestão `/clubes/:id/admin`

- Métricas: ativos 7d/30d, retenção, crescimento, engajamento (de `clube_metricas`). **Sem receita.**
- Gráficos com Recharts (shadcn chart).
- Gestão: editar clube, capa, regras, membros (kick/ban via `status`), cargos, convites (`convites`), moderação (`denuncias`, `moderacao_logs`).

**DB/RLS:** restrito a `curador_id` + admin via função `is_clube_curador`.

---

## Fase 9 — Página Pública do Creator `/creator/:username`

- Bio, clubes criados, eventos, reputação, conteúdos, seguidores (`conexoes`). Layout editorial premium.

---

## Fase 10 — Camada de IA (Lovable AI Gateway)

Edge functions:
- `clube-ai-recomendacoes` (gemini-3-flash-preview)
- `clube-ai-resumo-discussao` (gemini-2.5-pro)
- `clube-ai-perguntas-profundas`
- `clube-ai-matchmaking`
- `leitura-copiloto`

UI contextual (drawers, botões inline). Tratar 429/402 com toasts.

---

## Estrutura de pastas

```
src/
  pages/clubes/        Marketplace, ClubeDetalhe, ClubeLeituras, ClubeEventos, ClubeAdmin
  pages/creator/       Dashboard, PerfilPublico
  components/clubes/   marketplace/ header/ feed/ canais/ leituras/ eventos/ microgrupos/ admin/ ai/
  hooks/clubes/        useClubes, useClube, useFeed, useCanais, useMensagens, useEventos, useMicrogrupos, useClubeMetricas, useClubeMembership
  stores/              canalUIStore, presenceStore, draftStore
  lib/clubes/          helpers, formatters
supabase/functions/    clube-ai-* , leitura-copiloto
```

---

## Dependências a instalar

`zustand`, `framer-motion`, `react-markdown`, `rehype-sanitize`, (opcional) `@tanstack/react-virtual`.

---

## Próximo passo

Aprovando este plano, executo a **Fase 1** (design system editorial + Marketplace de Clubes funcional com filtros, seções e cards premium). Ao final, valido com você antes de seguir para a Fase 2.
