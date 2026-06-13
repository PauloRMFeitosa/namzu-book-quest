-- Adiciona coluna para registrar data/hora do aceite dos Termos de Uso
-- Obrigatório pela LGPD: evidência de que o usuário consentiu explicitamente
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz;
