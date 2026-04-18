
# Plano — App NAMZU (leitura + clubes + gamificação)

## Visão geral
App mobile-first (responsivo até desktop) em React + Tailwind, integrado ao Supabase já conectado. Autenticação por email/senha, navegação inferior fixa, drawer lateral, e telas focadas em ação ("Continuar leitura").

## Design system
Atualizar `index.css` e `tailwind.config.ts` com tokens HSL:
- Primary `#1A3B8B`, Secondary `#D1F2E5`, Accent `#88B4D8`, Background `#F7F9F7`, Text `#12263F`
- Radius 16px, sombra suave `0 6px 18px rgba(18,38,63,0.08)`, espaçamento base 8px
- Botões altura 52px; hover `#254DB3`, active `#142D6B`; transições 0.2s; hover scale 1.02
- Tipografia limpa (Inter), cards com sombra suave, bordas arredondadas

## Autenticação
- Página `/onboarding` (logo + "A sabedoria começa aqui!!!" + botões Começar / Já tenho conta)
- Página `/login` e `/signup` com Supabase Auth (email/senha), `emailRedirectTo: window.location.origin`
- Hook `useAuth` com `onAuthStateChange` + `getSession`; rotas protegidas redirecionam para onboarding
- Sem tabela `profiles` extra — usaremos `gamificacao_perfis` (já criada via trigger `handle_new_user_gam`)

## Layout principal
- `AppLayout` com:
  - Conteúdo da rota
  - **Bottom nav fixo** (mobile + desktop): Início, Clubes, Busca, Livros, Leituras, ≡ Mais
    - Ativo: Primary; Inativo: Accent
  - **Drawer lateral** (Sheet) acionado por ≡: Perfil, Metas, Histórico, Notificações, Configurações, Sair

## Telas

### Home (`/`)
- Saudação com nome do usuário
- Chips: 🔥 streak_atual · ⭐ xp_total · 🧠 nivel (de `gamificacao_perfis`)
- Card destaque "Leitura atual" (`usuario_livros` + join `obras` onde `status='lendo'`) com botão **Continuar lendo**
- Barra de progresso do dia
- Scroll horizontal "Últimas leituras"
- Lista "Clubes ativos" (join `clube_membros` + `clubes`)
- Estados vazios com CTA ("Comece sua primeira leitura" → leva para Busca)

### Busca (`/busca`) — crítica
- Input com debounce 300ms
- Chama RPC `rapid_action(input_text)` no Supabase (busca título / autor / ISBN)
- Resultados em cards: capa, título, autor, botão **Adicionar**
- Ao adicionar: se `obra_id` existir → `insert usuario_livros (status='quero_ler')`; se for resultado externo (sem obra), criar `obras` primeiro e então vincular
- Feedback via toast; tratar duplicatas

### Livros (`/livros`)
- Tabs: Lendo · Quero Ler · Lidos
- Grid responsivo (2 col mobile → 4+ desktop) com capa + barra de progresso
- Tap no card → tela Leituras

### Leituras (`/leituras/:id`)
- Detalhe do livro (join `usuario_livros` + `obras` + `edicoes`)
- Atualizar progresso (página/percentual), marcar como concluído (`update status='lido'` dispara trigger XP)
- Notas e review

### Clubes (`/clubes` e `/clubes/:id`)
- Lista de clubes ativos (`is_ativo=true`) com capa, nome, descrição, botão **Entrar** (insert em `clube_membros`)
- Detalhe: feed de `clube_posts` (com curtidas), input para criar post (insert respeita RLS de membro)
- Destaque de posts do curador

### Drawer "Mais"
- **Perfil**: dados do usuário + estatísticas de gamificação + conquistas (`usuario_conquistas` join `conquistas`)
- **Metas**: missões ativas (`missoes` + `usuario_missoes`) com progresso
- **Histórico**: log de XP (`gamificacao_xp_log`)
- **Notificações**: lista de `notificacoes`, marcar como lida
- **Configurações**: tema, conta, sair
- **Sair**: `supabase.auth.signOut()`

## Gamificação
- Componente `StatsChips` reutilizado em Home, Perfil e header
- XP/streak/nível atualizados automaticamente pelos triggers já existentes — apenas leitura no client

## Estados vazios & UX
- Toda lista vazia mostra ilustração leve + CTA acionável
- Skeletons durante loading
- Toasts (sonner) para ações (adicionado, post criado, entrou no clube, etc.)
- Microinterações: hover scale 1.02, transição 0.2s

## Stack técnico
- React Router (rotas acima), TanStack Query para data fetching/cache
- shadcn (Tabs, Sheet, Dialog, Card, Button, Input, Progress, Badge, Toast)
- `@/integrations/supabase/client` para todas as queries
- Hook `useAuth`, `useGamificacao`, `useLeituraAtual`

## Observações de backend
- A função `rapid_action(input_text)` é assumida como já existente no banco. Se a chamada falhar na primeira execução, criamos uma migration com a função (busca em `obras` por título/`titulo_ordenacao`, autores via `obra_autores`+`autores`, e `edicoes.isbn_13`).
- Nenhuma alteração de schema planejada inicialmente; podem surgir policies adicionais (ex.: SELECT em `clube_membros`, `clube_conteudos`, `notificacoes` UPDATE para marcar como lida) — adicionadas via migration conforme necessário durante a implementação.
