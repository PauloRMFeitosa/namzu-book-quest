# Admin — Edição completa + Filtro nos grids

Aplicar nas abas: **Usuários**, **Livros (obras)** e **Clubes**.

## 1. Edição com todos os campos da tabela

Cada formulário de edição passa a expor todos os campos editáveis da respectiva tabela.

**Livros (`obras`)**
Campos no modal de criar/editar: `titulo_original`, `titulo_ordenacao`, `slug`, `idioma_original`, `ano_primeira_publicacao`, `sinopse_padrao`, `capa_padrao_url`. (`id`/`created_at` somente leitura no edit.)

**Clubes (`clubes`)**
Adicionar ao formulário os campos hoje ausentes: `is_ativo` (switch), além dos já existentes. (`curador_id` mantido só-leitura exibido como info; `id`/`created_at` só leitura no edit.)

**Usuários** (via edge function `admin-manage-user`)
Modal de edição passa a aceitar e enviar:
- Auth: `email`, `password`, `full_name`
- Perfil (`perfis`): `username`, `nome_exibicao`, `bio`, `avatar_url`, `banner_url`, `cidade`, `pais`, `tipo_perfil`, `verificado`, `instagram_url`, `youtube_url`, `tiktok_url`, `site_url`
- Gamificação (`gamificacao_perfis`): `xp_total`, `nivel`, `streak_atual`, `streak_maximo`
- Admin role: checkbox que sincroniza `user_roles`

A edge function `admin-manage-user` será estendida para receber esses campos e fazer `update` em `perfis` e `gamificacao_perfis` (usando service role) além do `auth.admin.updateUserById`.

## 2. Filtro por campo/valor no grid

Adicionar acima de cada tabela uma barra de filtro com:
- `Select` com a lista de colunas filtráveis daquela aba
- `Input` de valor
- Botão **Filtrar** e botão **Limpar**

Comportamento:
- Texto: `ilike %valor%`
- Numérico/booleano: igualdade
- A query é refeita no Supabase com `.ilike()` / `.eq()` conforme o tipo da coluna
- Para a aba de Usuários (lista vem da edge function), o filtro é aplicado client-side sobre o array já carregado, com o mesmo seletor de campo + valor

Colunas filtráveis por aba:
- **Livros**: `titulo_original`, `ano_primeira_publicacao`, `idioma_original`, `slug`
- **Clubes**: `nome`, `categoria`, `visibilidade`, `duracao_tipo`, `is_ativo`
- **Usuários**: `email`, `full_name`, `nivel`, `xp_total`, `admin (sim/não)`

## Arquivos alterados

- `src/pages/admin/tabs/LivrosTab.tsx` — adicionar campos faltantes + barra de filtro
- `src/pages/admin/tabs/ClubesTab.tsx` — adicionar `is_ativo` no form + barra de filtro
- `src/pages/admin/tabs/UsuariosTab.tsx` — modal de edição expandido + barra de filtro client-side
- `supabase/functions/admin-manage-user/index.ts` — aceitar e persistir campos de `perfis` e `gamificacao_perfis`

## Detalhes técnicos

- Componente compartilhado `FilterBar` em `src/components/admin/FilterBar.tsx` para reuso (campo `Select`, valor `Input`, ações).
- Tipo das colunas declarado por aba: `{ key, label, type: 'text'|'number'|'boolean' }`.
- Para `boolean`, o `Input` vira `Select` com Sim/Não.
- `slug` em obras: manter geração automática só na criação; edição permite editar manualmente.
