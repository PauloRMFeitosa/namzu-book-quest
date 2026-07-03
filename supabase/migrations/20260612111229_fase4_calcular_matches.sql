
CREATE OR REPLACE FUNCTION calcular_matches(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := COALESCE(p_user_id, auth.uid());
  v_outros uuid[];
  v_outro  uuid;
BEGIN
  SELECT ARRAY(
    SELECT user_id FROM perfis
    WHERE perfil_publico = true
      AND user_id <> v_uid
  ) INTO v_outros;

  FOREACH v_outro IN ARRAY v_outros LOOP
    DECLARE
      v_int_comuns   int;
      v_gen_comuns   int;
      v_obras_comuns int;
      v_score        numeric;
      v_motivos      jsonb;
      v_int_nomes    text[];
      v_gen_nomes    text[];
    BEGIN
      SELECT COUNT(*),
             ARRAY_AGG(i.nome ORDER BY i.nome)
      INTO v_int_comuns, v_int_nomes
      FROM perfil_interesses pi1
      JOIN perfil_interesses pi2 ON pi2.interesse_id = pi1.interesse_id
        AND pi2.user_id = v_outro
      JOIN interesses i ON i.id = pi1.interesse_id
      WHERE pi1.user_id = v_uid;

      SELECT COUNT(DISTINCT oa.genero_id),
             ARRAY_AGG(DISTINCT g.nome ORDER BY g.nome)
      INTO v_gen_comuns, v_gen_nomes
      FROM usuario_livros ul1
      JOIN obra_generos oa ON oa.obra_id = ul1.obra_id
      JOIN generos g ON g.id = oa.genero_id
      WHERE ul1.user_id = v_uid
        AND ul1.status = 'lido'
        AND EXISTS (
          SELECT 1 FROM usuario_livros ul2
          JOIN obra_generos oa2 ON oa2.obra_id = ul2.obra_id
          WHERE ul2.user_id = v_outro
            AND ul2.status = 'lido'
            AND oa2.genero_id = oa.genero_id
        );

      SELECT COUNT(*)
      INTO v_obras_comuns
      FROM usuario_livros ul1
      WHERE ul1.user_id = v_uid
        AND ul1.status = 'lido'
        AND EXISTS (
          SELECT 1 FROM usuario_livros ul2
          WHERE ul2.user_id = v_outro
            AND ul2.obra_id = ul1.obra_id
            AND ul2.status = 'lido'
        );

      v_score := LEAST(100, (COALESCE(v_int_comuns,0) * 3
                           + COALESCE(v_gen_comuns,0) * 2
                           + COALESCE(v_obras_comuns,0) * 5)::numeric);

      IF v_score >= 30 THEN
        v_motivos := '[]'::jsonb;
        IF v_int_comuns  > 0 THEN
          v_motivos := v_motivos || to_jsonb(v_int_nomes[1:3]);
        END IF;
        IF v_gen_comuns  > 0 THEN
          v_motivos := v_motivos || to_jsonb(v_gen_nomes[1:2]);
        END IF;
        IF v_obras_comuns > 0 THEN
          v_motivos := v_motivos || jsonb_build_array(
            v_obras_comuns::text || ' livro' ||
            CASE WHEN v_obras_comuns > 1 THEN 's' ELSE '' END ||
            ' em comum'
          );
        END IF;

        INSERT INTO matches_intelectuais
          (user_a, user_b, compatibilidade, motivos, status)
        VALUES (
          LEAST(v_uid, v_outro),
          GREATEST(v_uid, v_outro),
          v_score,
          v_motivos,
          'ativo'
        )
        ON CONFLICT (user_a, user_b) DO UPDATE
          SET compatibilidade = EXCLUDED.compatibilidade,
              motivos         = EXCLUDED.motivos;
      END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION calcular_matches(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION recalcular_meus_matches()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT calcular_matches(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION recalcular_meus_matches() TO authenticated;
