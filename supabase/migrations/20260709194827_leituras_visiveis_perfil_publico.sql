-- Jornada de leitura visível no perfil: libera SELECT das tabelas de leitura
-- quando o perfil do dono é público, para o próprio dono e para admins.
-- Nenhuma permissão de escrita é alterada.

CREATE OR REPLACE FUNCTION pode_ver_leituras_de(p_dono uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_dono = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM perfis p
        WHERE p.user_id = p_dono AND p.perfil_publico = true
      );
$$;

GRANT EXECUTE ON FUNCTION pode_ver_leituras_de(uuid) TO authenticated;

CREATE POLICY "ver leituras conforme perfil" ON usuario_leituras
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_livros ul
      WHERE ul.id = usuario_leituras.usuario_livro_id
        AND pode_ver_leituras_de(ul.user_id)
    )
  );

CREATE POLICY "ver leituras conforme perfil" ON leituras
  FOR SELECT USING (pode_ver_leituras_de(user_id));

CREATE POLICY "ver progresso conforme perfil" ON leitura_progresso
  FOR SELECT USING (pode_ver_leituras_de(user_id));

CREATE POLICY "ver pre conforme perfil" ON leitura_pre
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_pre.leitura_id AND pode_ver_leituras_de(l.user_id))
  );

CREATE POLICY "ver conteudo conforme perfil" ON leitura_conteudo
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_conteudo.leitura_id AND pode_ver_leituras_de(l.user_id))
  );

CREATE POLICY "ver citacoes conforme perfil" ON leitura_citacoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_citacoes.leitura_id AND pode_ver_leituras_de(l.user_id))
  );

CREATE POLICY "ver aplicacoes conforme perfil" ON leitura_aplicacoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_aplicacoes.leitura_id AND pode_ver_leituras_de(l.user_id))
  );

CREATE POLICY "ver links conforme perfil" ON leitura_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_links.leitura_id AND pode_ver_leituras_de(l.user_id))
  );

CREATE POLICY "ver tags conforme perfil" ON leitura_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_tags.leitura_id AND pode_ver_leituras_de(l.user_id))
  );

CREATE POLICY "ver pos conforme perfil" ON leitura_pos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_pos.leitura_id AND pode_ver_leituras_de(l.user_id))
  );
