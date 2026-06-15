-- Expande o check constraint de tipo em clube_conteudos para incluir 'video' e 'link',
-- que são usados no formulário do frontend mas estavam ausentes na constraint original.
ALTER TABLE clube_conteudos
  DROP CONSTRAINT clube_conteudos_tipo_check,
  ADD CONSTRAINT clube_conteudos_tipo_check
    CHECK (tipo = ANY (ARRAY['audio', 'texto', 'pdf', 'live_gravada', 'video', 'link']));
