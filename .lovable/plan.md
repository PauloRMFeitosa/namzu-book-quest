## Objetivo
Permitir que o admin habilite/desabilite, globalmente, as abas internas do clube de leitura: **Feed, Leituras, Canais, Eventos, Membros, Conteúdos, Microgrupos**.

## Mudanças

### 1. Feature flags (`useFeatureFlags.ts`)
Adicionar 7 novas chaves em `FeatureFlagKey`, todas com default `true`:
- `show_clube_feed`
- `show_clube_leituras`
- `show_clube_canais`
- `show_clube_eventos`
- `show_clube_membros`
- `show_clube_conteudos`
- `show_clube_microgrupos`

Sem migração — `app_settings` já existe e o upsert cria a chave on-demand.

### 2. Painel admin — `VisibilidadeTab.tsx`
Adicionar uma seção **"Abas do Clube de Leitura"** com 7 switches, reutilizando o card e a função `toggle` já existentes. Cada um persiste em `app_settings` via upsert.

### 3. `ClubeDetalhe.tsx`
- Ler `flags` de `useFeatureFlags()` e `isAdmin` de `useIsAdmin()`.
- Mapear cada item de `BASE_TABS` à sua flag e filtrar as ocultas (admin sempre vê tudo, padrão do `FeatureRoute`).
- Se a aba na URL estiver oculta, redirecionar para a primeira visível.
- Cada `<TabsContent>` permanece (tabs ocultas simplesmente não renderizam o trigger).

## Comportamento
- Admin: vê todas as abas, mesmo desativadas.
- Curador e membros: respeitam as flags.
- Atualização reflete após invalidação de `app_settings` (já feita pelo toggle).
