
-- Retorna o percentual máximo registrado por usuario_livro_id
-- para leituras ativas (status = 'lendo') do usuário autenticado.
-- Usado para a barra de progresso nos BookCards.
CREATE OR REPLACE FUNCTION public.get_progresso_lendo()
RETURNS TABLE (usuario_livro_id uuid, percentual_lido numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ul.usuario_livro_id,
    MAX(lp.percentual_lido) AS percentual_lido
  FROM usuario_leituras ul
  JOIN leituras l          ON l.usuario_leitura_id = ul.id
  JOIN leitura_progresso lp ON lp.leitura_id = l.id
  WHERE lp.user_id = auth.uid()
    AND ul.status  = 'lendo'
  GROUP BY ul.usuario_livro_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_progresso_lendo() TO authenticated;
