
-- Habilita RLS no storage.objects (geralmente já está habilitado)
-- Policies para o bucket "Clubes"

-- Leitura pública (qualquer um pode ver as imagens)
CREATE POLICY "Clubes bucket - leitura pública"
ON storage.objects FOR SELECT
USING (bucket_id = 'Clubes');

-- Upload: apenas usuários autenticados, no próprio diretório user_id
CREATE POLICY "Clubes bucket - upload autenticado"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Clubes'
  AND auth.role() = 'authenticated'
);

-- Delete: apenas o dono do arquivo (user_id é o 3º segmento do path feed/clube_id/user_id/...)
CREATE POLICY "Clubes bucket - delete pelo dono"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'Clubes'
  AND auth.uid()::text = (storage.foldername(name))[2]
);
