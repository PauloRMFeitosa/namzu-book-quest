-- Correção do advisor anon_security_definer_function_executable:
-- remove EXECUTE de anon/PUBLIC em funções SECURITY DEFINER que só fazem
-- sentido autenticadas (RPCs pessoais, triggers e funções internas).
-- Mantidas para anon: match_clubes_por_gosto (onboarding pré-login) e os
-- helpers de RLS has_role / is_clube_curador / is_clube_membro.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'aceitar_termos','calcular_matches','calcular_streak_leitura',
        'conceder_xp','concluir_onboarding','desbloquear_conquista',
        'desseguir_usuario','dispensar_avaliacao','feed_atividade',
        'fn_criar_canais_padrao','fn_notificar_novo_livro_trilha',
        'fn_renotificar_avaliacoes_dispensadas','get_contagem_social',
        'get_generos_lidos','get_livros_por_mes','get_meus_matches',
        'get_minhas_citacoes','get_progresso_lendo','get_stats_leitura',
        'handle_new_user_gam','handle_new_user_perfil','is_seguindo',
        'notify_curtida_post','notify_novo_comentario','notify_novo_conteudo',
        'notify_novo_evento','notify_novo_post_feed','recalcular_meus_matches',
        'registrar_progresso_missao','rls_auto_enable','seed_estante_inicial',
        'seguir_usuario','trg_fn_autor_reset_conciliacao','trg_fn_marcar_avaliado',
        'trg_fn_notif_clube_curtida_post','trg_fn_notif_clube_novo_evento',
        'trg_fn_notif_clube_novo_membro','trg_gamificacao_insight',
        'trg_gamificacao_livro_concluido','trg_gamificacao_streak',
        'trg_missao_insight','trg_missao_paginas_lidas','trg_missao_post_clube'
      )
  loop
    execute format('revoke execute on function %s from public', fn.sig);
    execute format('revoke execute on function %s from anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;
