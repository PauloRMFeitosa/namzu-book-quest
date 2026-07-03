-- Correção do advisor security_definer_view (ERROR):
-- v_seguidores e v_seguindo passam a respeitar RLS do usuário consultante.
-- Para manter o comportamento atual (listas de seguidores visíveis no app),
-- cria-se policy de SELECT em conexoes para usuários autenticados.

create policy "conexoes_ativas_visiveis_autenticados"
  on public.conexoes
  for select
  to authenticated
  using (
    status = 'ativo'
    or seguidor_id = auth.uid()
    or seguido_id = auth.uid()
  );

alter view public.v_seguidores set (security_invoker = true);
alter view public.v_seguindo set (security_invoker = true);
