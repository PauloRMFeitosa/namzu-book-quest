## Resumo

<!-- O que muda e por quê. Cite a fase do docs/roadmap.md quando houver. -->

## Como testar

<!-- Passos para validar a mudança. -->

## Checklist

- [ ] `npm run lint`, `npm run typecheck` e `npm run test` passam localmente
- [ ] Textos de interface, nomes de domínio e comentários em pt-BR
- [ ] Mudança de schema tem migração versionada em `supabase/migrations/` e foi aplicada no remoto com a mesma versão
- [ ] `types.ts` regenerado após mudança de schema
- [ ] Funcionalidade nova está atrás de feature flag, quando aplicável
- [ ] Formulário de criação novo persiste rascunho no `localStorage`
- [ ] Chaves de query novas em `src/constants/queryKeys.ts`
- [ ] `CHANGELOG.md` atualizado
