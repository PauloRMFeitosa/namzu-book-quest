
CREATE OR REPLACE FUNCTION fn_criar_canais_padrao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO clube_canais (clube_id, nome, descricao, tipo, ordem, privado)
  VALUES
    (NEW.id, 'geral',  'Canal geral do clube', 'texto', 0, false),
    (NEW.id, 'avisos', 'Avisos e comunicados do curador', 'texto', 1, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_canais_padrao ON clubes;

CREATE TRIGGER trg_criar_canais_padrao
AFTER INSERT ON clubes
FOR EACH ROW
EXECUTE FUNCTION fn_criar_canais_padrao();
