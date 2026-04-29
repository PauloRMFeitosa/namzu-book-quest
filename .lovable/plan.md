## Objetivo

Habilitar **CRUD completo (criar, editar, excluir)** no painel admin para todas as entidades:

- **Usuários** — editar nome/email/senha, excluir conta (via edge function com service role)
- **Livros (obras)** — editar título, ano, sinopse, capa
- **Autores** — editar nome
- **Clubes** — editar todos os campos + excluir
- **Metas (missões)** — editar todos os campos
- **Conquistas** — editar todos os campos

A criação e exclusão já existem na maioria das tabs; falta o **editar** em todas e **excluir/editar** em usuários e clubes.

## Implementação

### 1. Edge Function `admin-manage-user`

Cria nova função com `verify_jwt = false` (validação manual do JWT em código), que verifica se o caller é admin via `user_roles` e suporta:

- `action: "update"` → atualiza email, senha e/ou `user_metadata.full_name` via `auth.admin.updateUserById`
- `action: "delete"` → remove a conta via `auth.admin.deleteUser` (bloqueia auto-exclusão)

### 2. Componente reutilizável `EditDialog`

Pequeno wrapper de Dialog com botão lápis na linha da tabela. Cada tab passa o registro atual e os campos editáveis.

### 3. Tabs atualizadas

Em cada tab adiciono botão **Editar** (ícone Pencil) ao lado do Excluir, abrindo um dialog pré-preenchido. Salvar faz `update` na tabela. Para **Usuários** e **Clubes**, também adiciono o botão Excluir.

| Tab | Editar | Excluir |
|---|---|---|
| Usuários | nome, email, senha (opcional) | sim (via edge function) |
| Livros | título, ano, sinopse, capa, idioma | já existe |
| Autores | nome completo (recalcula ordenação/normalizado) | já existe |
| Clubes | todos os campos + ativo | adicionar |
| Metas | todos os campos | já existe |
| Conquistas | todos os campos | já existe |

### 4. Confirmação de exclusão

Mantenho `confirm()` simples nas existentes; para usuários adiciono confirmação extra ("Esta ação é irreversível e remove os dados do auth.users").

## Arquivos

**Criar:**
- `supabase/functions/admin-manage-user/index.ts`
- `src/components/admin/EditDialog.tsx` (wrapper genérico)

**Editar:**
- `supabase/config.toml` — declarar `[functions.admin-manage-user] verify_jwt = false`
- `src/pages/admin/tabs/UsuariosTab.tsx` — botões Editar e Excluir + dialog
- `src/pages/admin/tabs/LivrosTab.tsx` — botão Editar + dialog
- `src/pages/admin/tabs/AutoresTab.tsx` — botão Editar + dialog
- `src/pages/admin/tabs/ClubesTab.tsx` — botão Editar e Excluir + dialog (mantém o toggle ativo)
- `src/pages/admin/tabs/MetasTab.tsx` — botão Editar + dialog
- `src/pages/admin/tabs/ConquistasTab.tsx` — botão Editar + dialog

## Detalhes técnicos

- A edge function valida o token JWT manualmente e checa `user_roles.role = 'admin'` antes de aceitar qualquer operação.
- O service role key é lido apenas no servidor via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — nunca exposto ao frontend.
- Updates nas tabelas (obras, autores, clubes, missoes, conquistas) usam as RLS já existentes ("Admin escreve …") com `has_role(auth.uid(),'admin')`, então funcionam diretamente do cliente para usuários admin.
- Excluir clube: remove o registro em `clubes`. Pode quebrar se houver FKs — neste caso oferecemos apenas desativar (já existente). Vou tentar `delete` e, em erro de FK, sugerir desativar via toast.
