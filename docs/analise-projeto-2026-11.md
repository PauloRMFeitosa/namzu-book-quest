# Análise do projeto NAMZU — novembro/2026

**Objetivo:** fotografia do estado atual do código, do banco e do processo, como base para planejar a próxima versão.

**Método:** leitura do repositório (branch `main`, commit `e2aa4d2`), execução de `lint`, `tsc`, `test` e `build`, e consulta aos *advisors* de segurança e performance do projeto Supabase `qiiuvlmauztjitflqcfd`.

---

## 1. Números gerais

| Métrica | Valor |
|---|---|
| Linhas de código em `src/` (TS/TSX) | ~43.500 |
| Páginas (`src/pages`) | 29 (4 sem rota) |
| Componentes | 166 |
| Hooks | 46 (25 na raiz + 4 subpastas) |
| Edge Functions no repo | 16 |
| Edge Functions no remoto | 19 |
| Arquivos de migração versionados | 70 |
| Tabelas, views e RPCs no schema | ~110 |
| Arquivos de teste | 2 (8 testes) |
| Commits | 90 (jun/26: 31, jul/26: 52, ago/26: 5, set/26: 2, out–nov/26: 0) |
| Tags / releases | 0 |
| Versão em `package.json` | `0.0.0` (nome ainda `vite_react_shadcn_ts`) |

## 2. Saúde imediata: o que passa

- `npm run lint`: sem erros.
- `tsc --noEmit`: sem erros (modo relaxado, `strict: false`).
- `npm run test`: 8/8 passando.
- `npm run build`: OK em ~14 s.

## 3. Pontos fortes

1. **Arquitetura legível.** Rotas em `App.tsx`, páginas por URL, componentes por domínio, hooks colocalizados, stores Zustand para UI. O `CLAUDE.md` documenta convenções reais.
2. **Feature flags centralizadas** (`app_settings` + `useFeatureFlags`) com 29 chaves tipadas, permitindo ligar/desligar módulos sem deploy.
3. **React Query com persistência** em `localStorage` e defaults conservadores, pensado para mobile e para reduzir carga no Supabase.
4. **Documentação de produto viva:** ADR do onboarding, regras de negócio (RN-ONB, RN-PAY, RN-QA), plano de gamificação com diagnóstico do banco real.
5. **Backend com lógica no banco:** triggers, RPCs `SECURITY DEFINER`, pg_cron, realtime. Reduz código no cliente.
6. **Padrão obrigatório de rascunho em formulários** aplicado em 12 diálogos.
7. **Blog Astro** separado em `apps/blog`, com SEO (RSS, sitemap) e conteúdo pt-BR.

## 4. Riscos e dívidas (ordenados por gravidade)

### 4.1 Segurança — ALTA

**a) Edge Functions públicas escrevendo com chave de serviço.**
`supabase/config.toml` marca 13 das 16 funções com `verify_jwt = false`. As funções `admin-*` e `reprocessar-obras` validam o usuário/role internamente, mas:
- `rapid-action` cria/atualiza `obras`, `autores` e `edicoes` com `SERVICE_ROLE_KEY` sem nenhuma verificação de quem chama. Qualquer pessoa na internet pode poluir o acervo.
- `ensure-profiles` lista todos os usuários via Auth Admin API e cria perfis, também sem autenticação.
- `obra-estatisticas` é somente leitura, risco baixo.

**b) Advisors de segurança do Supabase (consultados em 24/11/2026):**

| Aviso | Qtde | Impacto |
|---|---|---|
| Função `SECURITY DEFINER` executável por `anon` | 15 | `creditar_xp_clube`, `fechar_liga_semanal`, `match_clubes_por_gosto`… podem ser chamadas sem login. Um anônimo pode creditar XP a qualquer usuário. |
| Função `SECURITY DEFINER` executável por `authenticated` | 60 | Inclui `conceder_xp(p_user_id…)`, `desbloquear_conquista(p_user_id…)`, `seed_estante_inicial(p_user_id…)`: um usuário logado pode dar XP/conquistas a **outro** usuário via REST. |
| `search_path` mutável em função | 34 | Vetor clássico de escalada em Postgres. |
| Tabela com RLS ligado e sem política | 18 | Tabelas ficam inacessíveis pela API (seguro), mas sinaliza funcionalidades mortas: `pagamentos`, `creator_assinaturas`, `convites`, `user_presence`, `reacoes`… |
| `ranking_clube` (materialized view) exposta na API | 1 | Sem RLS. |
| Proteção contra senha vazada desativada | 1 | Configuração do Auth. |
| `pg_trgm` no schema `public` | 1 | Baixo. |

A migração `20260703145519_revogar_execute_anon_funcoes_security_definer` tentou resolver o item 1, mas 15 funções continuam expostas (criadas depois ou não cobertas).

**c) `.env` commitado no git** (contém apenas URL e chave publicável, então não é vazamento crítico, mas não está no `.gitignore` e o `.env.example` perde o sentido).

### 4.2 Divergência repositório × produção — ALTA

O `supabase/migrations/README.md` estabelece que repo e banco não podem divergir. Já divergem:

| Onde | O quê |
|---|---|
| Aplicado no remoto, **sem arquivo no repo** | `20260706162759_conquistas_leitura_conhecimento_triggers_e_retroativo`, `20260706213217_rls_select_usuario_conquistas`, `20260715134456_interacoes_diarias_rpc`, `20260831143635_meta_diaria_leitura`, `20260831143924_meta_diaria_leitura_hardening` |
| No repo, **sem registro no remoto** | `20260810153000_sync_trigger_gamificacao_livro_concluido_insert` |
| Edge Functions ativas no remoto **sem código no repo** | `buscar-livros`, `clever-api`, `enviar-lembretes-meta` |
| Baseline | Tabelas centrais (`obras`, `clubes`, `perfis`, `usuario_livros`…) nunca tiveram migração; não é possível recriar o banco do zero. |

Consequência: a feature "meta diária de leitura" e a função de lembretes existem em produção mas não no código-fonte versionado. `types.ts` provavelmente também está defasado, o que explica parte dos `as any`.

### 4.3 Performance de banco — MÉDIA

| Aviso | Qtde |
|---|---|
| `auth.uid()` reavaliado por linha em políticas RLS (`auth_rls_initplan`) | 114 |
| Múltiplas políticas permissivas na mesma tabela/ação | 134 |
| Chaves estrangeiras sem índice | 56 |
| Índices duplicados | 8 |
| Índices sem uso | 24 |

Hoje a base é pequena e isso não dói. Com crescimento de clubes/feed, as políticas RLS serão o gargalo.

### 4.4 Performance do frontend — MÉDIA

- Build gera **um único chunk de 2,7 MB** (742 kB gzip). Nenhum uso de `React.lazy`; todas as 29 páginas e o painel admin entram no bundle inicial de todo usuário.
- `heic2any` (1,35 MB) já é carregado sob demanda, bom.
- `logo-namzu.png` com 670 kB no bundle.
- Para um app mobile-first em rede brasileira, isso é o principal custo de primeira abertura.

### 4.5 Qualidade e manutenção — MÉDIA

- **190 ocorrências de `as any`** em 60 arquivos. Boa parte é `(supabase as any).from(...)`, sintoma de `types.ts` desatualizado ou de tabelas fora do tipo gerado. Isso anula a proteção do TypeScript nas queries.
- **`queryKeys.ts` tem 18 linhas; existem 212 `queryKey` inline** com strings soltas. A convenção do `CLAUDE.md` não está sendo seguida; invalidações ficam frágeis.
- **Código morto:** páginas `Clubes.tsx`, `Index.tsx`, `LeituraDetalhe.tsx` e `Onboarding.tsx` (431 linhas) não têm rota. `src/features/` é um esqueleto com 3 `index.ts` reexportando, uma refatoração iniciada e abandonada.
- **Arquivos grandes:** `Busca.tsx` (1.059 linhas), `Livros.tsx` (685), `CadastroManual.tsx` (639), `ObraDetalhe.tsx` (618), `Perfil.tsx` (570).
- **Cobertura de testes quase nula:** 2 arquivos para 43k linhas. Nenhum teste de hook, de RPC ou de edge function.
- **Sem CI:** não existe `.github/workflows`. Lint, tipos e testes só rodam se alguém lembrar.
- Dependência `lovable-tagger` ainda presente (origem no Lovable).
- Dois lockfiles (`bun.lock`/`bun.lockb` e `package-lock.json`).

### 4.6 Produto — observações

- **Funcionalidades iniciadas e não concluídas:** monetização (`pagamentos`, `creator_assinaturas`, RN-PAY-01 só documenta ganchos), convites, presença online, reações, duas trilhas de onboarding coexistindo (`/comecar` novo e `/onboarding-interesses` do "Código ME").
- **Gamificação:** o plano em `docs/gamificacao-plano-implementacao.md` descreve Fases 1–3 aplicadas (motor unificado, schema, missões); a flag `show_gamificacao_clube` segue desligada aguardando a Fase 4.
- **Ritmo de desenvolvimento:** 83 commits em jun–jul, 7 em ago–set, zero desde 24/09. O projeto está parado há dois meses, o que torna este o momento certo para consolidar antes de adicionar.

## 5. Recomendação para a nova versão

Sugestão de encarar a próxima versão como **v1.0 "Consolidação"**: sem funcionalidade nova visível, mas com fundação segura e reproduzível. Depois disso, versões 1.x por funcionalidade.

### Fase A — Segurança (1 semana)
1. Exigir autenticação em `rapid-action` e `ensure-profiles` (ou restringir a admin via `has_role`).
2. Revogar `EXECUTE` de `anon` nas 15 funções apontadas e de `authenticated` nas que recebem `p_user_id` (trocar por `auth.uid()` interno).
3. `SET search_path = public` nas 34 funções.
4. Ativar proteção contra senha vazada no Auth.
5. Tirar `.env` do git e adicioná-lo ao `.gitignore`.

### Fase B — Reproduzibilidade (1 semana)
1. `supabase db pull` para gerar baseline das tabelas centrais.
2. Trazer para o repo as 5 migrações e as 3 edge functions que só existem no remoto; aplicar a `20260810` ou removê-la.
3. Regenerar `types.ts` e reduzir `as any` ao mínimo.
4. CI no GitHub Actions: lint + tsc + test + build em todo PR.

### Fase C — Performance e limpeza (1–2 semanas)
1. `React.lazy` por rota, com o admin em chunk separado; `manualChunks` para Radix/Recharts; logo em WebP.
2. Corrigir as políticas RLS (`(select auth.uid())`), consolidar políticas duplicadas, indexar as 56 FKs, remover índices duplicados.
3. Apagar páginas sem rota, `src/features/`, `lovable-tagger` e um dos lockfiles.
4. Migrar `queryKey` inline para a fábrica em `queryKeys.ts`.
5. Quebrar `Busca.tsx` e `Livros.tsx` em componentes.

### Fase D — Versão e processo
1. Renomear o pacote para `namzu`, versão `1.0.0`, criar `CHANGELOG.md` e tag `v1.0.0`.
2. Política de versão: `1.x` para funcionalidades, `1.x.y` para correções.

### Candidatas a 1.1+ (funcionalidades)
- Fase 4 da gamificação (ligar `show_gamificacao_clube`).
- Decidir o destino de monetização/convites/presença: implementar ou apagar tabelas.
- Unificar os dois onboardings.
- PWA real (hoje o service worker é apenas kill-switch).
