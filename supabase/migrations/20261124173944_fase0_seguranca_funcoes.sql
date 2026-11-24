-- Fase 0 (docs/roadmap.md) — endurecimento de permissões de funções.
--
-- Aplicada no remoto em 24/11/2026 (versão 20261124173944).
-- Diagnóstico feito em 24/11/2026 no projeto remoto com consultas de leitura
-- (pg_proc, pg_policies, pg_trigger, cron.job) e busca por `.rpc(` no app.
--
-- Três grupos:
--   1. Funções internas: só são chamadas por triggers, pelo pg_cron ou por
--      outras funções SECURITY DEFINER. Ninguém deveria chamá-las pela API.
--      Hoje um usuário logado consegue, por exemplo, chamar
--      conceder_xp(<id de outra pessoa>, 99999, ...) via /rest/v1/rpc.
--   2. Funções da API que exigem login mas ainda aceitam o papel `anon`.
--   3. Funções sem `search_path` fixo.
--
-- Ficam como estão, de propósito:
--   - has_role, is_clube_curador, is_clube_membro, pode_ver_leituras_de:
--     usadas em políticas RLS avaliadas também para `anon`. Revogar o EXECUTE
--     faria consultas anônimas falharem com "permission denied".
--   - match_clubes_por_gosto: chamada pelo onboarding anônimo (/comecar) e só
--     lê clubes públicos.
--   - normalize_book_text e texto_similarity: SQL imutáveis e SECURITY INVOKER.
--     Fixar search_path impediria o inlining pelo planner sem ganho real.
--
-- Gatilhos continuam disparando: o Postgres não confere EXECUTE da função de
-- trigger no momento do disparo, só na criação do trigger.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Funções internas: sem acesso pela API
-- ───────────────────────────────────────────────────────────────────────────

-- 1a. Motor de gamificação e rotinas de cron
REVOKE EXECUTE ON FUNCTION public.conceder_xp(uuid, integer, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.desbloquear_conquista(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_progresso_missao(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.creditar_xp_clube(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calcular_matches(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fechar_liga_semanal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_renotificar_avaliacoes_dispensadas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 1b. Funções de trigger SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.fn_criar_canais_padrao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_notificar_novo_livro_trilha() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_gam() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_perfil() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_curtida_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_novo_comentario() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_novo_conteudo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_novo_evento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_novo_post_feed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_conquista_comunidade_curtidas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_conquista_comunidade_membro() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_conquista_comunidade_posts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_autor_reset_conciliacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_marcar_avaliado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_notif_clube_curtida_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_notif_clube_novo_evento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_notif_clube_novo_membro() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_gamificacao_conhecimento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_gamificacao_insight() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_gamificacao_leitura_clube() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_gamificacao_livro_concluido() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_gamificacao_streak() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_missao_insight() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_missao_paginas_lidas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_missao_post_clube() FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Funções da API: somente usuários autenticados
-- ───────────────────────────────────────────────────────────────────────────
-- O GRANT explícito vem depois do REVOKE de PUBLIC para que `authenticated`
-- não dependa do privilégio herdado de PUBLIC.

REVOKE EXECUTE ON FUNCTION public.definir_perfil_publico(boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.definir_perfil_publico(boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_atividade_leitura_anual(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_atividade_leitura_anual(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_interacoes_diarias(uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_interacoes_diarias(uuid, integer) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. search_path fixo
-- ───────────────────────────────────────────────────────────────────────────
-- `public, extensions` reproduz o search_path efetivo de hoje
-- ("$user", public, extensions), então o comportamento não muda.

-- 3a. SECURITY DEFINER (onde o risco é real)
ALTER FUNCTION public.dispensar_avaliacao(uuid, boolean) SET search_path = public, extensions;
ALTER FUNCTION public.fn_criar_canais_padrao() SET search_path = public, extensions;
ALTER FUNCTION public.fn_notificar_novo_livro_trilha() SET search_path = public, extensions;
ALTER FUNCTION public.fn_renotificar_avaliacoes_dispensadas() SET search_path = public, extensions;
ALTER FUNCTION public.notify_curtida_post() SET search_path = public, extensions;
ALTER FUNCTION public.notify_novo_comentario() SET search_path = public, extensions;
ALTER FUNCTION public.notify_novo_conteudo() SET search_path = public, extensions;
ALTER FUNCTION public.notify_novo_evento() SET search_path = public, extensions;
ALTER FUNCTION public.notify_novo_post_feed() SET search_path = public, extensions;
ALTER FUNCTION public.trg_fn_marcar_avaliado() SET search_path = public, extensions;
ALTER FUNCTION public.trg_fn_notif_clube_curtida_post() SET search_path = public, extensions;
ALTER FUNCTION public.trg_fn_notif_clube_novo_evento() SET search_path = public, extensions;
ALTER FUNCTION public.trg_fn_notif_clube_novo_membro() SET search_path = public, extensions;

-- 3b. SECURITY INVOKER (higiene; zera o aviso do advisor)
ALTER FUNCTION public.atualizar_streak() SET search_path = public, extensions;
ALTER FUNCTION public.calcular_similaridade_obras(uuid, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.criar_usuario_leitura(uuid, uuid, text, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.finalizar_leitura(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.fn_auto_edicao_id_from_obra() SET search_path = public, extensions;
ALTER FUNCTION public.fn_notificacao_definir_aba() SET search_path = public, extensions;
ALTER FUNCTION public.fn_set_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.fn_sync_obra_id_from_edicao() SET search_path = public, extensions;
ALTER FUNCTION public.iniciar_leitura(uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.perfil_preferencias_set_atualizado_em() SET search_path = public, extensions;
ALTER PROCEDURE public.processar_obras_duplicadas(numeric) SET search_path = public, extensions;
ALTER FUNCTION public.refresh_ranking() SET search_path = public, extensions;
ALTER FUNCTION public.registrar_progresso(uuid, integer, numeric) SET search_path = public, extensions;
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.trg_concluir_leitura() SET search_path = public, extensions;
ALTER FUNCTION public.trg_curtidas_count() SET search_path = public, extensions;
ALTER FUNCTION public.trg_fn_criar_avaliacao_livro() SET search_path = public, extensions;
ALTER FUNCTION public.trg_fn_set_updated_at_obras_cand_wikidata() SET search_path = public, extensions;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, extensions;
