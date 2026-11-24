# Changelog

Todas as mudanças relevantes do NAMZU são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [versionamento semântico](https://semver.org/lang/pt-BR/). A política de versões e o plano de fases estão em `docs/roadmap.md`.

## [Não lançado]

### Segurança
- `rapid-action` passa a exigir usuário autenticado; `ensure-profiles` cria apenas o perfil de quem chama (backfill geral restrito a admin).
- Migração `20261124173000_fase0_seguranca_funcoes`: revoga o acesso pela API a funções internas de gamificação, cron e triggers, restringe três RPCs a usuários autenticados e fixa `search_path` em 32 funções. Aplicação em produção descrita em `docs/runbooks/fase0-seguranca-funcoes.md`.

### Adicionado
- Helper compartilhado de autenticação para Edge Functions (`supabase/functions/_shared/auth.ts`).
- Roadmap por fases para reposicionar o produto como plataforma do organizador de clube de leitura (`docs/roadmap.md`).
- Roteiro de entrevista com organizadores (`docs/descoberta/roteiro-entrevista-organizadores.md`).
- Análise técnica do projeto e benchmark de concorrentes (`docs/analise-projeto-2026-11.md`, `docs/benchmark-concorrentes-2026-11.md`).
- CI no GitHub Actions com lint, checagem de tipos, testes e build.
- Modelo de pull request com checklist do projeto.
- Script `npm run typecheck`.

## Histórico anterior

Até novembro de 2026 o projeto não tinha versões nem changelog. O histórico desse período está no `git log` e nos pull requests de 1 a 102.
