# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

**Proprietário e desenvolvedor do projeto:** Paulo Moura

## Visão Geral do Projeto

O NAMZU é uma plataforma social de leitura em português brasileiro. Os usuários gerenciam bibliotecas pessoais, registram progresso de leitura, salvam citações, participam de clubes de leitura e descobrem outros leitores por meio de matching inteligente. O código é um SPA em React com backend no Supabase (PostgreSQL + Edge Functions), implantado no Vercel.

## Direção do Produto

O NAMZU está sendo reposicionado: de rede social de leitura para **plataforma do organizador de clube de leitura**, com o lado individual (estante, progresso, citações) mantido como app do membro. O plano por fases, os critérios de saída de cada fase e os padrões de versionamento estão em `docs/roadmap.md`. Antes de propor ou implementar funcionalidade nova, verifique em qual fase do roadmap ela se encaixa.

O CI (`.github/workflows/ci.yml`) roda lint, checagem de tipos, testes e build em todo PR. Mudanças relevantes devem ser registradas no `CHANGELOG.md`.

### Publicação e testes (fase atual, cerca de 30 usuários)

- **O Vercel só publica a `main`.** Os deploys de preview estão desligados nos dois `vercel.json` (`git.deploymentEnabled`), porque o plano gratuito tem limite diário de deploys. Não existe link de preview por PR.
- **O teste manual é feito em produção**, depois da mescla. Por isso, antes de mesclar, o PR precisa estar com o CI verde e com o fluxo conferido localmente (testes e navegador com API simulada).
- **Menos PRs, maiores:** junte o trabalho relacionado em um PR só, em vez de vários pequenos. Cada mescla gera dois deploys (app e blog).
- **Migração em produção continua pedindo o OK do Paulo**, e deve ser aplicada antes da mescla do código que depende dela.
- Rever esta regra quando a base de usuários crescer.

## Comandos

```bash
npm run dev        # Servidor de desenvolvimento Vite na porta 8080
npm run build      # Build de produção
npm run lint       # Verificação ESLint
npm run typecheck  # Checagem de tipos (tsc --noEmit)
npm run test       # Executa todos os testes uma vez (Vitest)
npm run test:watch # Modo watch
```

Para executar um arquivo de teste específico:
```bash
npx vitest run src/path/to/file.test.ts
```

Variáveis de ambiente necessárias (copiar de `.env.example` para `.env`, que fica fora do repositório; em produção elas ficam no projeto do Vercel):
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
- **`src/services/analytics.ts`** — Eventos de produto. Use `registrarEvento("nome_do_evento", { clubeId, props })` depois que a ação deu certo. A lista de eventos e as regras estão em `docs/metricas-produto.md`.
- **`src/services/monitoramento.ts`** — Erros do app. O registro é automático (erro não tratado, promessa rejeitada, `ErrorBoundary` e consulta que falha) e aparece em Admin > Erros do app. As regras estão em `docs/monitoramento.md`.
- **`src/pages/admin/`** — Admin, com layout próprio e fora do `AppLayout` (rota com `<ProtectedRoute semLayout>`). As seções ficam em `GRUPOS`, em `Admin.tsx`, e a aberta vai no endereço (`/admin?secao=`). Painel, Métricas e Clubes leem a função `admin_painel` por `useAdminPainel`; a lógica está em `src/lib/adminPainel.ts`.
- **Página pública do clube** — `src/pages/clubes/PaginaPublicaClube.tsx`, aberta sem login em `/c/:endereco` e em `<endereco>.namzu.com.br`. No subdomínio, `App.tsx` mostra só essa página (`enderecoDoHost` em `src/lib/enderecoClube.ts`). O organizador configura em Painel > Página pública. A lista de endereços reservados existe no código e no banco e as duas precisam andar juntas. A prévia do link no WhatsApp vem de `api/pagina-clube.ts`, uma função do Vercel que só atende robôs de prévia (regras no `vercel.json`); ela não importa nada de `src/`. Ver `docs/pagina-publica.md`.
- **Divulgação** — link do grupo do clube (tabela `clube_grupos`, só para quem faz parte), botão `EnviarNoWhatsApp` ao lado de cada "copiar para o grupo" e imagens do encontro e da trilha (`src/components/clubes/shared/`). O que cada rede permite e o que ainda falta está em `docs/divulgacao.md`.
- **Roteiro "Primeiros passos"** — cartão no topo da Visão geral do painel do organizador (`src/components/clubes/painel-organizador/PrimeirosPassos.tsx`), para onde a criação do clube leva. Os passos e a regra de quando cada um fica feito estão em `src/lib/primeirosPassos.ts`. Função nova que o organizador precise conhecer entra como passo ali. Ver `docs/primeiros-passos.md`.
- **Planos do organizador** — Admin > Planos (`src/pages/admin/tabs/PlanosTab.tsx`), com criação e edição em `/admin/planos/novo` e `/admin/planos/:id`. O catálogo de recursos e a lógica ficam em `src/lib/planos.ts`. Os limites de clubes, membros e co-curadores valem no app e são recusados pelo banco (uso em `src/lib/planoDoClube.ts`); os recursos e o limite de IA ainda não bloqueiam nada. A situação e as próximas etapas estão em `docs/planos.md`.
- **`src/pages/clubes/PainelOrganizador.tsx`** — Painel do organizador, em `/clubes/:id/painel?secao=`. Usa a mesma moldura do Admin (`src/components/painel/CascaDoPainel.tsx`) e reaproveita os componentes do clube (`VisaoGeralTab`, `MembrosTab`, `TrilhaGestao`, `EventosTab`). Toda tela de gestão do clube entra aqui, não como aba da página do clube, que fica só com o que o membro usa. As pendências e o histórico estão em `src/lib/painelOrganizador.ts`.

### Configuração do React Query

O `QueryClient` em `App.tsx` define padrões globais: `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus/Reconnect/Mount: false`, `retry: 1`. Esses valores são intencionais — alterá-los causará requisições excessivas ao Supabase.

### Feature Flags

As flags são armazenadas na tabela `app_settings` do Supabase e lidas via `useFeatureFlags()`. A lista completa de chaves válidas é a union `FeatureFlagKey` em `src/hooks/useFeatureFlags.ts`. Admins ignoram todas as flags. Ao adicionar uma nova funcionalidade controlada por flag:
1. Adicione a chave da flag em `FeatureFlagKey` e seu padrão em `DEFAULTS`.
2. Envolva a rota com `<FeatureRoute flag="sua_flag">`.

### Backend (Supabase)

- **Edge Functions** ficam em `supabase/functions/`. Cada função é um módulo Deno independente. O diretório `_shared/` contém utilitários compartilhados entre funções (normalização de gênero, etc.).
- **IA:** `clube-ai` e `leitura-copiloto` chamam o modelo por `supabase/functions/_shared/ia.ts` (API do Google, com o gateway antigo de reserva). Segredos, troca de modelo e mensagens de erro estão em `docs/ia.md`. Função nova que use IA deve chamar `chamarIA` desse módulo.
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

## Criação em Página, Não em Janela (Obrigatório)

**Todo fluxo novo de criação DEVE ser uma página com rota própria, não um `Dialog` com formulário.** Criar algo (obra na trilha, encontro, conteúdo, clube) merece espaço para explicar, mostrar prévia e validar, e a página sobrevive melhor ao uso no celular.

- **Rota:** aninhada no contexto, terminando em `/nova` ou `/novo` (ex.: `/clubes/:id/trilha/nova`), com `lazy()` em `App.tsx` e as mesmas proteções da rota-mãe (`ProtectedRoute`, `FeatureRoute`).
- **Permissão:** a página confere quem pode criar e redireciona para a tela-mãe quando não pode. O botão escondido não basta, porque a URL é acessível direto.
- **Estrutura:** botão de voltar e título no topo, seções numeradas, prévia do que será criado, erro em texto junto do formulário e os botões "Cancelar" e de confirmar no fim.
- **Lógica:** validação e montagem dos dados ficam em `src/lib/`, com testes; a página só liga as peças.
- **Rascunho:** a regra de rascunho abaixo continua valendo. Na página, "aberto" é a página montada: restaure no estado inicial, salve a cada alteração e limpe só no sucesso.
- **Depois de salvar:** volte para a tela de origem (ex.: `/clubes/:id/painel?secao=leitura`). Quando é comum criar vários itens em sequência (como os livros da trilha), fique na página com o formulário limpo, mostre abaixo o que já foi criado e ofereça "Concluir". Sair sem salvar não apaga o rascunho.
- **Peças prontas:** `PaginaCriacao`, `SecaoCriacao`, `ErroCriacao` e `AcoesCriacao` em `src/components/criacao/`, `useRascunho` para o rascunho e `useAcessoGestao` para a permissão dentro do clube (`liberado` para quem gere, `liberadoParaMembro` para o que todo membro pode criar).
- **Modelos:** `src/pages/clubes/CriarEvento.tsx` (formulário simples) e `src/pages/clubes/AdicionarObraTrilha.tsx` (criação em sequência).

`Dialog` continua valendo para confirmação, ação rápida de um campo e edição pontual. Todas as criações do clube já são páginas. As janelas que restam na tabela abaixo são do lado do leitor (citação, insight, registro de leitura) e de edição; não crie novas janelas de criação.

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
- **Formulários com react-hook-form:** usar `watch()` para observar mudanças em vez de `useEffect` nos campos individuais.
- **Páginas de criação:** usar o hook `useRascunho(chave, vazio)` de `src/hooks/useRascunho.ts`, que já restaura, salva e limpa.

### Formulários já implementados

| Arquivo | Chave |
|---|---|
| `pages/clubes/CriarConteudo.tsx` (página) | `draft-conteudo-{clubeId}` |
| `pages/clubes/CriarEvento.tsx` (página) | `draft-evento-{clubeId}` |
| `pages/clubes/AdicionarObraTrilha.tsx` (página) | `draft-trilha-{clubeId}` |
| `pages/clubes/CriarClube.tsx` (página) | `draft-criar-clube` |
| `pages/clubes/CriarMicrogrupo.tsx` (página) | `draft-microgrupo-{clubeId}` |
| `pages/clubes/CriarCanal.tsx` (página) | `draft-canal-{clubeId}` |
| `RegistrarLeituraDialog.tsx` | `draft-registrar-leitura-{usuarioLeituraId}` |
| `CitacaoDialog.tsx` | `draft-citacao-{livroId}` |
| `InsightDialog.tsx` | `draft-insight-{livroId}` |
| `AplicacaoDialog.tsx` | `draft-aplicacao-{livroId}` |
| `ReportarConteudoDialog.tsx` | `draft-denuncia-{conteudoId}` |
| `FeedbackDialog.tsx` | `draft-feedback-geral` |
| `CronogramaDialog.tsx` | `draft-cronograma-{trilhaId}` (só enquanto há alteração não salva) |
| `AtaDialog.tsx` | `draft-ata-{eventoId}` (só enquanto há alteração não salva) |
| `pages/clubes/AbrirVotacaoData.tsx` (página) | `draft-votacao-data-{clubeId}` |
| `pages/clubes/CriarAviso.tsx` (página) | `draft-aviso-{clubeId}` |
| `pages/admin/EditarPlano.tsx` (página, só na criação) | `draft-plano` |

## Convenções Principais

- **Idioma do domínio:** UI e terminologia de negócio sempre em português. Nomes de variáveis/funções seguem a convenção portuguesa (`clube`, `leitura`, `citacao`, `obra`, `perfil`). Nomes de componentes React usam PascalCase em português.
- **Alias de path:** `@/` resolve para `src/`. Sempre use esse alias em vez de caminhos relativos.
- **TypeScript em modo relaxado** (`strict: false`, `noImplicitAny: false`) para permitir iteração rápida. Não ative o modo strict sem uma migração coordenada.
- **`supabase/types.ts` é gerado automaticamente.** Regenere com `supabase gen types typescript` após mudanças no schema; nunca edite manualmente.
- **Service worker** (`public/sw.js`) usa um padrão de kill-switch — só ativa em produção e faz limpeza em dev/preview para evitar regressões de cache obsoleto.
