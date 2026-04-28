# Plano: Página de Administração

## Objetivo
Criar uma área `/admin` protegida por role, onde administradores podem visualizar a gamificação e cadastrar/gerenciar usuários, livros, autores, clubes, metas (missões) e conquistas.

## 1. Sistema de Roles (banco)
Hoje não existe controle de admin. Vou criar a estrutura segura padrão:

- Enum `app_role` com valores `admin`, `user`
- Tabela `user_roles` (`id`, `user_id`, `role`, unique por par)
- RLS habilitada em `user_roles`
- Função `has_role(_user_id, _role)` `SECURITY DEFINER` (evita recursão)
- Policies:
  - Usuário pode ler suas próprias roles
  - Apenas admins podem inserir/remover roles

**Importante:** após a migração, o usuário precisará marcar manualmente o primeiro admin pelo SQL Editor (vou deixar o comando pronto na resposta).

## 2. Policies adicionais para escrita pública
Várias tabelas hoje só têm SELECT público (obras, autores, edicoes, clubes, conquistas, missoes). Vou adicionar policies de INSERT/UPDATE/DELETE restritas a `has_role(auth.uid(), 'admin')` para:

- `obras`, `autores`, `obra_autores`, `edicoes`
- `clubes`, `clube_trilhas`, `clube_conteudos`
- `conquistas`, `missoes`

## 3. Frontend

### Hook
- `src/hooks/useIsAdmin.ts` — consulta `user_roles` do usuário logado e retorna `{ isAdmin, loading }`

### Layout / Navegação
- `AppLayout.tsx`: adicionar item "Admin" no drawer lateral, visível apenas se `isAdmin`
- `App.tsx`: nova rota `/admin/*` protegida por `ProtectedRoute` + checagem de admin (redireciona para `/` se não for)

### Páginas (`src/pages/admin/`)
Layout com tabs (shadcn `Tabs`) numa única página `Admin.tsx`, ou subrotas. Proposta: **uma página com Tabs** para simplicidade mobile:

1. **Visão Gamificação** — top do ranking (`gamificacao_perfis` ordenado por `xp_total`), total de XP distribuído, distribuição por nível, conquistas mais desbloqueadas
2. **Usuários** — lista de usuários (via `gamificacao_perfis` + auth metadata acessível), atribuir/remover role admin
3. **Livros (Obras + Edições)** — listar, criar nova obra (título, slug, ano, sinopse, capa), vincular autores, criar edições
4. **Autores** — listar, criar (nome completo, normalizado, ordenação), editar, excluir
5. **Clubes** — listar, criar (nome, descrição, curador, objetivo, regras, capa, preço, duração), editar, ativar/desativar
6. **Metas (Missões)** — listar, criar (código, título, descrição, tipo, meta_acao, meta_valor, xp_recompensa, período ativo)
7. **Gamificação (Conquistas)** — listar, criar conquista (código, nome, descrição, ícone, xp_recompensa)

Cada aba usa formulários `react-hook-form` + `zod`, tabelas `shadcn/ui Table` e dialogs para criação/edição. Toda a IO com Supabase via cliente.

### Limitação importante: cadastrar usuários
O cliente Supabase (anon key) **não pode criar usuários arbitrários**. Duas opções:

- **A (recomendada):** botão "Convidar usuário" envia link de cadastro / instruções; o admin promove a admin depois pela aba Usuários
- **B:** criar uma **edge function** `admin-create-user` que usa `SUPABASE_SERVICE_ROLE_KEY` + `auth.admin.createUser()`, protegida verificando se o caller tem role admin

Vou implementar a **opção B** (edge function) para que o admin consiga criar usuários direto pela página, com email + senha temporária.

## 4. Detalhes técnicos

```text
src/
  hooks/useIsAdmin.ts
  components/AdminRoute.tsx        (wrapper que checa isAdmin)
  pages/admin/
    Admin.tsx                      (shell com Tabs)
    tabs/
      GamificacaoTab.tsx
      UsuariosTab.tsx
      LivrosTab.tsx
      AutoresTab.tsx
      ClubesTab.tsx
      MetasTab.tsx
      ConquistasTab.tsx
supabase/functions/admin-create-user/index.ts
```

Migrações:
- enum `app_role`, tabela `user_roles`, função `has_role`
- policies de admin nas tabelas listadas
- (opcional) view `admin_usuarios` agregando dados de `gamificacao_perfis` para listagem

## 5. Ações manuais necessárias após implementação
1. Promover seu usuário a admin no SQL Editor:
   ```sql
   insert into user_roles (user_id, role)
   values ('<seu-user-id>', 'admin');
   ```
2. (opcional) revisar policies das tabelas se quiser bloqueios diferentes.

## Fora do escopo
- Edição inline avançada (drag/drop, bulk), uploads de imagem para Storage (capas continuam por URL)
- Logs de auditoria das ações de admin
