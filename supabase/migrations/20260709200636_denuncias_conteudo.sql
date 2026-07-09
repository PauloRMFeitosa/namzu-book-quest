-- Canal de denúncia de conteúdo (notice and takedown — direitos autorais e abusos).
-- Usuários autenticados registram denúncias; apenas admins listam e resolvem.

CREATE TABLE denuncias_conteudo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  denunciante_id uuid NOT NULL,
  denunciado_user_id uuid,
  tipo_conteudo text NOT NULL,
  conteudo_id uuid,
  contexto_url text,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  resolvido_em timestamptz,
  observacao_admin text
);

ALTER TABLE denuncias_conteudo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario cria denuncia" ON denuncias_conteudo
  FOR INSERT TO authenticated
  WITH CHECK (denunciante_id = auth.uid());

CREATE POLICY "ver denuncias" ON denuncias_conteudo
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR denunciante_id = auth.uid());

CREATE POLICY "admin atualiza denuncias" ON denuncias_conteudo
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
