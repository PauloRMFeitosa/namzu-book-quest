-- usuario_conquistas estava com RLS ativado sem nenhuma policy: nenhum
-- cliente conseguia ler conquistas desbloqueadas — o contador "Conquistas"
-- e o quadro de conquistas apareciam sempre vazios no Perfil, no Perfil
-- Público, no card "Próxima Conquista" e no feed de atividade.
-- (mesma classe de bug corrigida em 20260704234027 para missões/liga/clube.)

-- A escrita continua restrita: inserções acontecem apenas via funções
-- SECURITY DEFINER (desbloquear_conquista), então basta a policy de SELECT.

-- Leitura liberada para usuários autenticados: o Perfil Público exibe o
-- quadro de conquistas de qualquer leitor (mesmo padrão de usuario_livros,
-- "Authenticated users can view any user library").
CREATE POLICY "Usuarios autenticados veem conquistas desbloqueadas"
  ON public.usuario_conquistas FOR SELECT
  TO authenticated
  USING (true);
