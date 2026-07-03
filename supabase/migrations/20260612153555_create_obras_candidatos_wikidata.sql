
-- ============================================================
-- #36: Tabela obras_candidatos_wikidata
-- Simétrica a autores_candidatos_wikidata —
-- armazena candidatos Wikidata para reconciliação de obras.
-- ============================================================

CREATE TABLE IF NOT EXISTS obras_candidatos_wikidata (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relação com a obra local
  obra_id       uuid          NOT NULL
    REFERENCES obras(id) ON DELETE CASCADE,

  -- Identificação no Wikidata
  qid           varchar       NOT NULL,          -- ex: "Q174870"
  url_wikidata  text          NOT NULL,          -- https://www.wikidata.org/wiki/Q174870

  -- Dados descritivos vindos do Wikidata
  titulo        text          NOT NULL,          -- label em pt/en
  descricao     text,                            -- description do item
  ano_publicacao smallint,                       -- P577 (publication date)
  idioma_original text,                          -- P407 (language of work)

  -- Score calculado pela lógica de reconciliação
  score_namzu   numeric       NOT NULL,

  -- Payload bruto do Wikidata (para auditoria/reprocessamento)
  dados_externos jsonb        NOT NULL DEFAULT '{}',

  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  -- Única combinação obra + candidato
  CONSTRAINT uq_obra_candidato_wikidata UNIQUE (obra_id, qid)
);

-- Índice para lookup por obra
CREATE INDEX IF NOT EXISTS idx_obras_cand_wikidata_obra_id
  ON obras_candidatos_wikidata (obra_id);

-- Índice para lookup por QID (útil ao verificar se já existe)
CREATE INDEX IF NOT EXISTS idx_obras_cand_wikidata_qid
  ON obras_candidatos_wikidata (qid);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION trg_fn_set_updated_at_obras_cand_wikidata()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_set_updated_at_obras_cand_wikidata
  ON obras_candidatos_wikidata;
CREATE TRIGGER trg_set_updated_at_obras_cand_wikidata
  BEFORE UPDATE ON obras_candidatos_wikidata
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at_obras_cand_wikidata();

-- RLS: service role tem acesso total; anon/authenticated só leitura
ALTER TABLE obras_candidatos_wikidata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access"
  ON obras_candidatos_wikidata
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated read"
  ON obras_candidatos_wikidata
  FOR SELECT
  TO authenticated
  USING (true);
