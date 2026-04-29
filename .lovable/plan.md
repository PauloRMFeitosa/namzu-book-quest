## Objetivo

Adicionar no painel **Administração** uma nova aba **"Visibilidade"** onde o admin pode ligar/desligar globalmente para todos os usuários:

- Página **Clubes**
- Página **Metas**
- Página **Histórico**
- Página **Notificações**
- Bloco de **Gamificação na Home** (StatsChips: XP, nível, streak)

Quando desligado, o item desaparece da navegação inferior, do menu "Mais" e a rota correspondente redireciona para a Home. Na Home, o bloco de gamificação some.

## Como vai funcionar

1. **Tabela `app_settings`** (key/value JSON) no Supabase, leitura pública (qualquer usuário lê), escrita só admin via RLS.
   - Chaves: `show_clubes`, `show_metas`, `show_historico`, `show_notificacoes`, `show_gamificacao_home` (boolean, default `true`).

2. **Hook `useFeatureFlags()`** que faz uma única query cacheada (React Query) e expõe os valores. Disponível em toda a app.

3. **AppLayout**: filtra `navItems` (Clubes) e `drawerItems` (Metas, Histórico, Notificações) com base nas flags. Admin sempre vê tudo (bypass).

4. **Home**: esconde o `<StatsChips />` quando `show_gamificacao_home = false`.

5. **Rotas protegidas**: criar wrapper `<FeatureRoute flag="show_clubes">` que redireciona para `/` quando a flag está off (proteção caso o usuário acesse a URL diretamente). Aplicado em `/clubes`, `/metas`, `/historico`, `/notificacoes`.

6. **Aba Admin "Visibilidade"** (`src/pages/admin/tabs/VisibilidadeTab.tsx`):
   - 5 switches, um por flag, com label descritivo.
   - Salvamento por toggle (upsert imediato + toast).

## Detalhes técnicos

**Migração SQL:**
```sql
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
alter table public.app_settings enable row level security;

create policy "Todos leem settings" on public.app_settings
  for select using (true);
create policy "Admin escreve settings" on public.app_settings
  for all using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));

insert into public.app_settings(key,value) values
  ('show_clubes','true'::jsonb),
  ('show_metas','true'::jsonb),
  ('show_historico','true'::jsonb),
  ('show_notificacoes','true'::jsonb),
  ('show_gamificacao_home','true'::jsonb)
on conflict (key) do nothing;
```

**Arquivos a criar:**
- `src/hooks/useFeatureFlags.ts`
- `src/components/FeatureRoute.tsx`
- `src/pages/admin/tabs/VisibilidadeTab.tsx`

**Arquivos a editar:**
- `src/pages/admin/Admin.tsx` — adicionar tab "Visibilidade" (primeira posição).
- `src/components/AppLayout.tsx` — filtrar nav/drawer pelas flags (admin vê tudo).
- `src/pages/Home.tsx` — esconder `StatsChips` quando flag off.
- `src/App.tsx` — envolver rotas `/clubes`, `/metas`, `/historico`, `/notificacoes` com `<FeatureRoute>`.

## Comportamento para o admin

O admin **sempre vê** todos os menus mesmo com flags desligadas (para poder testar e reativar). Usuários comuns respeitam as flags.
