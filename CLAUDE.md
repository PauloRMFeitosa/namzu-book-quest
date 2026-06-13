# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NAMZU is a Portuguese-language social reading platform. Users manage personal libraries, record reading progress, save quotes, participate in reading clubs, and discover other readers through intelligent matching. The codebase is a React SPA backed by Supabase (PostgreSQL + Edge Functions), deployed on Vercel.

## Commands

```bash
npm run dev        # Vite dev server on port 8080
npm run build      # Production build
npm run lint       # ESLint check
npm run test       # Run all tests once (Vitest)
npm run test:watch # Watch mode
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

Environment variables required (copy from `.env.example`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Architecture

### Frontend

- **`src/App.tsx`** — Router root. All routes that need auth are wrapped in `<ProtectedRoute>`. Feature-flagged pages are additionally wrapped in `<FeatureRoute flag="...">`. Admin-only pages use `<AdminRoute>`.
- **`src/pages/`** — One file per route. Portuguese names match the URL segments (`/clubes` → `Clubes.tsx`, `/leituras` → `Leituras.tsx`).
- **`src/components/`** — Grouped by feature domain: `clubes/`, `leituras/`, `gamificacao/`, `social/`, `avaliacoes/`, `admin/`. Shared Radix/shadcn primitives live in `components/ui/`.
- **`src/hooks/`** — Feature hooks colocated with their logic. `useAuth` (auth context + Supabase session), `useFeatureFlags` (flag table reader), `useTheme`, `useFontSize`.
- **`src/stores/`** — Zustand stores for UI-only state (e.g., `canalUIStore.ts` tracks the selected channel, reply drafts, pending messages inside a club's channel view).
- **`src/integrations/supabase/`** — `client.ts` (singleton Supabase client), `types.ts` (auto-generated from Supabase schema — do not hand-edit).
- **`src/services/`** — Thin wrappers around Supabase queries for reuse across components.
- **`src/constants/queryKeys.ts`** — Centralized React Query key factory. Add new keys here instead of inline strings.

### React Query Setup

`QueryClient` in `App.tsx` sets global defaults: `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus/Reconnect/Mount: false`, `retry: 1`. These are intentional — changing them will cause excessive Supabase requests.

### Feature Flags

Flags are stored in the `app_settings` Supabase table and read via `useFeatureFlags()`. The full list of valid flag keys is the `FeatureFlagKey` union in `src/hooks/useFeatureFlags.ts`. Admins bypass all flags. When adding a new gated feature:
1. Add the flag key to `FeatureFlagKey` and its default to `DEFAULTS`.
2. Wrap the route with `<FeatureRoute flag="your_flag">`.

### Backend (Supabase)

- **Edge Functions** live in `supabase/functions/`. Each function is a self-contained Deno module. The `_shared/` directory holds utilities shared across functions (genre normalization, etc.).
- **Migrations** in `supabase/migrations/`. The main schema file is `fase4_citacoes_e_matches.sql`, which defines quotes (`leitura_citacoes`), intelligent user matching RPC (`calcular_matches`), and the scoring formula: `(common_interests × 3) + (common_genres × 2) + (common_books × 5)`, normalized 0–100.
- **`supabase/config.toml`** — Edge function registration. New functions must be added here to be deployed.

### Styling

Custom Tailwind theme in `tailwind.config.ts`: primary navy (`#1A3B8B`), secondary mint (`#D1F2E5`). Custom shadows (`soft`, `elevated`, `glow`), gradients, and two font families — `Inter` (sans) and `Fraunces` (display/serif). CSS variables are in `src/index.css`.

shadcn/ui components are configured via `components.json` and installed into `src/components/ui/`. Use the shadcn CLI to add/update UI primitives; do not manually modify generated files in that folder unless fixing a bug.

## Language

**All communication in this project must be in Brazilian Portuguese (pt-BR).** This applies to:

- Respostas e explicações do assistente de IA (Claude)
- Textos de interface do usuário (labels, botões, mensagens, placeholders, toasts, erros)
- Nomes de variáveis, funções, hooks, componentes e arquivos de domínio de negócio (`clube`, `leitura`, `citacao`, `obra`, `perfil`, `curador`, etc.)
- Comentários no código
- Mensagens de commit
- Títulos e descrições de pull requests

Exceções permitidas (inglês obrigatório):
- Palavras-chave da linguagem (TypeScript, SQL)
- Nomes de bibliotecas e APIs externas (`supabase`, `useQuery`, `toast`, etc.)
- Identificadores técnicos de infraestrutura (`edge function`, `bucket`, `RLS`, etc.)

## Persistência de Rascunho em Formulários (Obrigatório)

**Todo modal ou formulário de criação DEVE persistir o rascunho no `localStorage`** para que o usuário não perca dados ao sair do app e voltar (comportamento comum em mobile).

### Padrão obrigatório

```typescript
import { useState, useEffect } from "react";

// 1. Definir chave única fora do componente
const draftKey = (id: string) => `draft-nome-do-form-${id}`;

// 2. Dentro do componente — restaurar ao abrir
useEffect(() => {
  if (!open) return;
  const raw = localStorage.getItem(draftKey(id));
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (d.campo !== undefined) setCampo(d.campo);
    // ... demais campos
  } catch {}
}, [open, id]);

// 3. Dentro do componente — salvar a cada alteração
useEffect(() => {
  if (!open) return;
  localStorage.setItem(draftKey(id), JSON.stringify({ campo1, campo2 }));
}, [open, id, campo1, campo2]);

// 4. No handler de submit bem-sucedido — limpar draft
localStorage.removeItem(draftKey(id));
reset(); // resetar estado
onOpenChange(false);
```

### Regras

- **Chave única por entidade:** inclua sempre o ID do contexto (`clubeId`, `livro.id`, `usuarioLeituraId`) para evitar colisão entre instâncias diferentes.
- **Nunca salvar quando fechado:** sempre guarde com `if (!open) return` no effect de save.
- **Limpar apenas no sucesso:** cancelar mantém o rascunho para quando o usuário reabrir.
- **Formulários de edição (não criação):** não aplicar — esses já carregam dados existentes do banco.
- **Formulários com react-hook-form:** usar `watch()` para observar mudanças em vez de `useEffect` nos campos individuais (ver `CriarConteudoDialog.tsx`).

### Formulários já implementados

| Arquivo | Chave |
|---|---|
| `CriarConteudoDialog.tsx` | `draft-conteudo-{clubeId}` |
| `CriarEventoDialog.tsx` | `draft-evento-{clubeId}` |
| `AdicionarObraTrilhaDialog.tsx` | `draft-trilha-{clubeId}` |
| `CriarClubeDialog.tsx` | `draft-criar-clube` |
| `CriarMicrogrupoDialog.tsx` | `draft-microgrupo-{clubeId}` |
| `CriarCanalDialog.tsx` | `draft-canal-{clubeId}` |
| `RegistrarLeituraDialog.tsx` | `draft-registrar-leitura-{usuarioLeituraId}` |
| `CitacaoDialog.tsx` | `draft-citacao-{livroId}` |
| `InsightDialog.tsx` | `draft-insight-{livroId}` |
| `AplicacaoDialog.tsx` | `draft-aplicacao-{livroId}` |

## Key Conventions

- **Idioma do domínio:** UI e terminologia de negócio sempre em português. Nomes de variáveis/funções seguem a convenção portuguesa (`clube`, `leitura`, `citacao`, `obra`, `perfil`). Nomes de componentes React usam PascalCase em português.
- **Path alias:** `@/` resolves to `src/`. Always use this alias rather than relative paths.
- **TypeScript strictness is intentionally loose** (`strict: false`, `noImplicitAny: false`) to allow rapid iteration. Do not enable strict mode without a coordinated migration.
- **`supabase/types.ts` is auto-generated.** Regenerate with `supabase gen types typescript` after schema changes; never edit manually.
- **Service worker** (`public/sw.js`) uses a kill-switch pattern — it only activates in production and performs cleanup on dev/preview to prevent stale-cache regressions.
