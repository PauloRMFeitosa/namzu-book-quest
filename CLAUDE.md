# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

**Proprietário do projeto:** Paulo Feitosa

## Visão Geral do Projeto

O NAMZU é uma plataforma social de leitura em português brasileiro. Os usuários gerenciam bibliotecas pessoais, registram progresso de leitura, salvam citações, participam de clubes de leitura e descobrem outros leitores por meio de matching inteligente. O código é um SPA em React com backend no Supabase (PostgreSQL + Edge Functions), implantado no Vercel.

## Comandos

```bash
npm run dev        # Servidor de desenvolvimento Vite na porta 8080
npm run build      # Build de produção
npm run lint       # Verificação ESLint
npm run test       # Executa todos os testes uma vez (Vitest)
npm run test:watch # Modo watch
```

Para executar um arquivo de teste específico:
```bash
npx vitest run src/path/to/file.test.ts
```

Variáveis de ambiente necessárias (copiar de `.env.example`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Arquitetura

### Frontend

- **`src/App.tsx`** — Raiz do roteador. Todas as rotas que precisam de autenticação são envolvidas em `<ProtectedRoute>`. Páginas com feature flag usam adicionalmente `<FeatureRoute flag="...">`. Páginas exclusivas de admin usam `<AdminRoute>`.
- **`src/pages/`** — Um arquivo por rota. Nomes em português correspondem aos segmentos de URL (`/clubes` → `Clubes.tsx`, `/leituras` → `Leituras.tsx`).
- **`src/components/`** — Agrupados por domínio de funcionalidade: `clubes/`, `leituras/`, `gamificacao/`, `social/`, `avaliacoes/`, `admin/`. Primitivos compartilhados do Radix/shadcn ficam em `components/ui/`.
- **`src/hooks/`** — Hooks de funcionalidade colocalizados com sua lógica. `useAuth` (contexto de autenticação + sessão Supabase), `useFeatureFlags` (leitor da tabela de flags), `useTheme`, `useFontSize`.
- **`src/stores/`** — Stores Zustand para estado de UI (ex.: `canalUIStore.ts` rastreia o canal selecionado, rascunhos de resposta e mensagens pendentes dentro da visualização de canal de um clube).
- **`src/integrations/supabase/`** — `client.ts` (cliente Supabase singleton), `types.ts` (gerado automaticamente pelo schema do Supabase — não editar manualmente).
- **`src/services/`** — Wrappers finos sobre queries do Supabase para reutilização entre componentes.
- **`src/constants/queryKeys.ts`** — Fábrica centralizada de chaves do React Query. Adicione novas chaves aqui em vez de strings inline.

### Configuração do React Query

O `QueryClient` em `App.tsx` define padrões globais: `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus/Reconnect/Mount: false`, `retry: 1`. Esses valores são intencionais — alterá-los causará requisições excessivas ao Supabase.

### Feature Flags

As flags são armazenadas na tabela `app_settings` do Supabase e lidas via `useFeatureFlags()`. A lista completa de chaves válidas é a union `FeatureFlagKey` em `src/hooks/useFeatureFlags.ts`. Admins ignoram todas as flags. Ao adicionar uma nova funcionalidade controlada por flag:
1. Adicione a chave da flag em `FeatureFlagKey` e seu padrão em `DEFAULTS`.
2. Envolva a rota com `<FeatureRoute flag="sua_flag">`.

### Backend (Supabase)

- **Edge Functions** ficam em `supabase/functions/`. Cada função é um módulo Deno independente. O diretório `_shared/` contém utilitários compartilhados entre funções (normalização de gênero, etc.).
- **Migrações** em `supabase/migrations/` — arquivos versionados (`<timestamp>_<nome>.sql`) espelham o histórico real aplicado ao projeto remoto (ver `supabase/migrations/README.md`). Toda mudança de schema deve gerar um arquivo aqui e ser aplicada no remoto com a mesma versão. Arquivos antigos sem versionamento ficam em `legado/` (ex.: `fase4_citacoes_e_matches.sql`, que define citações, a RPC `calcular_matches` e a fórmula de pontuação `(interesses_comuns × 3) + (generos_comuns × 2) + (livros_comuns × 5)`, normalizada de 0 a 100).
- **`supabase/config.toml`** — Registro de Edge Functions. Novas funções devem ser adicionadas aqui para serem implantadas.

### Estilização

Tema Tailwind customizado em `tailwind.config.ts`: azul navy primário (`#1A3B8B`), mint secundário (`#D1F2E5`). Sombras customizadas (`soft`, `elevated`, `glow`), gradientes e duas famílias de fonte — `Inter` (sans) e `Fraunces` (display/serif). Variáveis CSS estão em `src/index.css`.

Componentes shadcn/ui são configurados via `components.json` e instalados em `src/components/ui/`. Use o CLI do shadcn para adicionar/atualizar primitivos de UI; não modifique manualmente os arquivos gerados nessa pasta, exceto para corrigir bugs.

## Idioma

**Toda a comunicação neste projeto deve ser em português brasileiro (pt-BR).** Isso se aplica a:

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

// 4. No handler de submit bem-sucedido — limpar rascunho
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
| `ReportarConteudoDialog.tsx` | `draft-denuncia-{conteudoId}` |

## Convenções Principais

- **Idioma do domínio:** UI e terminologia de negócio sempre em português. Nomes de variáveis/funções seguem a convenção portuguesa (`clube`, `leitura`, `citacao`, `obra`, `perfil`). Nomes de componentes React usam PascalCase em português.
- **Alias de path:** `@/` resolve para `src/`. Sempre use esse alias em vez de caminhos relativos.
- **TypeScript em modo relaxado** (`strict: false`, `noImplicitAny: false`) para permitir iteração rápida. Não ative o modo strict sem uma migração coordenada.
- **`supabase/types.ts` é gerado automaticamente.** Regenere com `supabase gen types typescript` após mudanças no schema; nunca edite manualmente.
- **Service worker** (`public/sw.js`) usa um padrão de kill-switch — só ativa em produção e faz limpeza em dev/preview para evitar regressões de cache obsoleto.
