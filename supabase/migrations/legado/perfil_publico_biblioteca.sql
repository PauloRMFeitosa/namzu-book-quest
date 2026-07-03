-- Permite que usuários autenticados leiam a biblioteca de qualquer perfil público.
-- Corrige: prateleiras (Lendo, Concluídos, Quero Ler, Favoritos) aparecem zeradas
-- na página /perfis/:id pois a única policy existente restringe SELECT ao próprio dono.
CREATE POLICY "Authenticated users can view any user library"
ON usuario_livros
FOR SELECT
TO authenticated
USING (true);
