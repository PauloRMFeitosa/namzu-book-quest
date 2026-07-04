-- RLS estava ativado sem nenhuma policy nessas tabelas: nenhum cliente
-- conseguia ler missões próprias, liga semanal ou XP do clube.

-- usuário lê o próprio progresso de missões
CREATE POLICY "Ver proprio progresso de missoes"
  ON public.usuario_missoes FOR SELECT
  USING (auth.uid() = user_id);

-- membros ativos do clube leem a liga semanal do clube
CREATE POLICY "Membros veem liga semanal"
  ON public.clube_temporadas_ranking FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clube_membros m
    WHERE m.clube_id = clube_temporadas_ranking.clube_id
      AND m.user_id  = auth.uid()
      AND m.status   = 'ativo'
  ));

-- membros ativos do clube leem o XP/nível do clube
CREATE POLICY "Membros veem gamificacao do clube"
  ON public.clube_gamificacao FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clube_membros m
    WHERE m.clube_id = clube_gamificacao.clube_id
      AND m.user_id  = auth.uid()
      AND m.status   = 'ativo'
  ));
