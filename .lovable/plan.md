O problema atual não parece ser o carregamento do menu. A requisição real do app para `user_roles` está voltando `[]` para o usuário logado:

```text
user_id atual no app: a633d6a8-bf66-44f4-bdf2-df764e01fa0e
email no token: paulormf@gmail.com
consulta: user_roles?user_id=eq.a633...&role=eq.admin
resposta: []
```

Ou seja: para o usuário que está logado agora, o frontend não encontra uma linha `role = admin` visível em `public.user_roles`. Mesmo que exista uma role cadastrada, provavelmente ela está vinculada a outro UUID de usuário, ou o app precisa consultar a role de forma mais robusta.

Plano de correção:

1. Ajustar a verificação de admin
   - Trocar a consulta direta em `useIsAdmin` por uma chamada mais confiável à função segura `public.has_role(user.id, 'admin')`, via RPC.
   - Manter fallback para a consulta direta em `user_roles` caso o RPC não esteja disponível.
   - Preservar o estado de carregamento para evitar esconder o menu antes da consulta terminar.

2. Melhorar a navegação para admin
   - No menu “Mais”, exibir um estado de carregamento enquanto a role está sendo conferida.
   - Se `isAdmin = true`, mostrar o item “Admin”.
   - Opcionalmente, adicionar um botão/link direto para `/admin` em Configurações para facilitar o acesso quando o menu lateral não for percebido.

3. Adicionar diagnóstico seguro no frontend
   - Se a consulta de admin falhar ou retornar falso, registrar no console apenas dados não sensíveis úteis para depuração: `user.id`, `email`, resultado da role e erro Supabase.
   - Isso ajuda a confirmar se o UUID cadastrado no Supabase é exatamente o mesmo do usuário logado.

4. Ajustar o banco, se necessário
   - Se o diagnóstico confirmar que a role está em outro UUID, inserir a role correta para:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('a633d6a8-bf66-44f4-bdf2-df764e01fa0e', 'admin')
ON CONFLICT DO NOTHING;
```

5. Validação
   - Recarregar o app.
   - Abrir “Mais”.
   - Confirmar que “Admin” aparece.
   - Testar acesso direto a `/admin`.

Arquivos que serão alterados após aprovação:
- `src/hooks/useIsAdmin.ts`
- `src/components/AppLayout.tsx`
- Possivelmente `src/pages/Configuracoes.tsx` para incluir um atalho de admin se a role estiver ativa.

Observação importante: pelo log de rede, o UUID atualmente logado é `a633d6a8-bf66-44f4-bdf2-df764e01fa0e`. Se a role foi cadastrada em qualquer outro UUID, o menu não aparecerá mesmo com o código correto.