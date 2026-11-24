# Changelog

Todas as mudanças relevantes do NAMZU são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [versionamento semântico](https://semver.org/lang/pt-BR/). A política de versões e o plano de fases estão em `docs/roadmap.md`.

## [Não lançado]

### Segurança
- `rapid-action` passa a exigir usuário autenticado; `ensure-profiles` cria apenas o perfil de quem chama (backfill geral restrito a admin).
- Migração `20261124173944_fase0_seguranca_funcoes`: revoga o acesso pela API a funções internas de gamificação, cron e triggers, restringe três RPCs a usuários autenticados e fixa `search_path` em 32 funções. Aplicada em produção em 24/11/2026; registro em `docs/runbooks/fase0-seguranca-funcoes.md`.

- Migração `20261124175313_fase0_privacidade_rpcs_leitura`: cinco RPCs de estatísticas de leitura passam a respeitar perfil privado. Aplicada em produção em 24/11/2026.

### Alterado
- `rapid-action` no repositório passa a ser o código que roda em produção (o repo tinha uma versão antiga).
- `salvar-progresso-leitura` e `reprocessar-generos` no repositório passam a ser o código publicado, que era mais novo.
- Lista de migrações do repositório igualada à do banco: cinco migrações recuperadas do remoto e uma removida.

### Adicionado
- Auditoria das Edge Functions publicadas contra o repositório (`docs/auditoria-edge-functions-2026-11.md`).
- Edge Function `enviar-lembretes-meta`, que só existia em produção.
- Helper compartilhado de autenticação para Edge Functions (`supabase/functions/_shared/auth.ts`).
- Roadmap por fases para reposicionar o produto como plataforma do organizador de clube de leitura (`docs/roadmap.md`).
- Roteiro de entrevista com organizadores (`docs/descoberta/roteiro-entrevista-organizadores.md`).
- Análise técnica do projeto, benchmark de concorrentes e estimativa de tamanho de mercado (`docs/analise-projeto-2026-11.md`, `docs/benchmark-concorrentes-2026-11.md`, `docs/tamanho-mercado-2026-11.md`).
- CI no GitHub Actions com lint, checagem de tipos, testes e build.
- Modelo de pull request com checklist do projeto.
- Script `npm run typecheck`.

## Histórico anterior

Até novembro de 2026 o projeto não tinha versões nem changelog. O histórico desse período está no `git log` e nos pull requests de 1 a 102.
