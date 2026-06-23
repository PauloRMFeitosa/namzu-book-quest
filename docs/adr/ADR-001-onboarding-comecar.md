# ADR-001 — Onboarding público `/comecar` com máquina de estado anônimo→autenticado

**Status:** Proposta — aguardando aprovação  
**Data:** 2026-06-23  
**Autor:** Claude Code (Fase 0 — reconhecimento)  
**Feature flag:** `show_onboarding`

---

## Contexto

### Problema atual
O visitante sem sessão cai em `/onboarding` (rota já existente, ligada ao fluxo "Código ME") ou em `/login`, dependendo do estado da flag `show_onboarding` no `ProtectedRoute`. Em ambos os casos, o valor é cobrado **antes** de ser entregue.

Adicionalmente, o redirecionamento pós-login ignora a URL de origem: `Login.tsx` navega sempre para `/` (linha 28), descartando qualquer deep link (`/clubes/:id`, `/obras/:id`, etc.).

### Objetivo do novo fluxo
Implementar 6 telas de onboarding em `/comecar` que entregam valor primeiro — estante demo, quiz de gosto, resultado personalizado — e só pedem conta na penúltima tela. A tese: **entregar valor antes de pedir trabalho**.

---

## Decisão

### 1. Nova rota pública `/comecar`

- Criar `/comecar` como rota **completamente pública** (fora do `ProtectedRoute`), separada do `/onboarding` existente.
- O fluxo existente (`/onboarding` → `Onboarding.tsx` e `/onboarding-interesses` → `OnboardingInteresses.tsx`) **não é alterado** — continua funcionando para usuários já cadastrados que ainda não completaram o perfil.
- Novo visitante sem sessão será redirecionado de `/` para `/comecar` quando `show_onboarding = true` (já verificado no `ProtectedRoute`). Quando `false`, mantém comportamento atual (→ `/login`).

### 2. Máquina de estado anônimo → autenticado

```
[ANÔNIMO]                     [AUTENTICADO]
    │                               │
    ▼                               │
/comecar                            │
    │                               │
    ├─ T1: Estante demo (estático)  │
    ├─ T2: Quiz gêneros ─────────── localStorage (namzu_onboarding)
    ├─ T3: Quiz livros ──────────── localStorage
    ├─ T4: Objetivo ─────────────── localStorage
    ├─ T5: Resultado (estante mock) │
    └─ T6: Criar conta ─────────────┤
                                    │
                          signup() Supabase Auth
                                    │
                          ┌─────────▼──────────┐
                          │ merge em ordem:    │
                          │ 1. perfil_preferencias INSERT
                          │ 2. seed_estante_inicial()
                          │ 3. match_clubes_por_gosto()
                          │ 4. localStorage.clear()
                          └────────────────────┘
                                    │
                                    ▼
                              / (app completo)
```

**Persistência local:** Zustand store com `persist` middleware, chave `namzu_onboarding`, salvando `{ generos, livrosAmados, ritmo, objetivo, etapaAtual }`. Nada vai ao Supabase antes do signup.

**Reentrada:** se `namzu_onboarding` existe no localStorage ao abrir `/comecar`, retomar da `etapaAtual`. Se usuário já tem `perfil_preferencias` no banco, pular o quiz e ir direto para `/`.

**Idempotência:** a função `seed_estante_inicial` verificará existência prévia em `usuario_livros` antes de inserir; `match_clubes_por_gosto` verificará `clube_membros` antes de fazer join.

### 3. Feature flag gating

A flag `show_onboarding` já existe na tabela `app_settings` e no hook `useFeatureFlags`. O gating é feito no `ProtectedRoute` (linha ~35): quando `true`, redireciona para `/comecar` em vez de `/login`.

Não haverá `<FeatureRoute flag="show_onboarding">` envolvendo `/comecar` — a rota deve ser **sempre acessível diretamente** (para que links compartilhados de `/comecar` funcionem). O controle fica apenas no redirect de entrada.

### 4. Correção do returnTo (bug de deep link)

Em `ProtectedRoute.tsx`, antes de redirecionar, salvar a URL de origem:
```tsx
// antes:
<Navigate to="/onboarding" replace />

// depois:
<Navigate to="/comecar" state={{ returnTo: location.pathname + location.search }} replace />
```

Em `Login.tsx` e `Signup.tsx`, após autenticação bem-sucedida, usar `location.state?.returnTo`:
```tsx
const destination = location.state?.returnTo ?? '/';
navigate(destination, { replace: true });
```

O mesmo deve ser aplicado ao OAuth (Google) via query param `?returnTo=` na URL de callback.

### 5. Alinhamento de design system

O prompt de referência menciona **Lora** + **DM Sans** e cores `#0E2A45` / `#5FCF9B`. O design system real do repositório usa:

| Elemento | Prompt (referência) | Codebase real | Decisão |
|----------|---------------------|---------------|---------|
| Fonte display | Lora | **Fraunces** | Usar Fraunces |
| Fonte corpo | DM Sans | **Inter** | Usar Inter |
| Navy | `#0E2A45` | `#1A3B8B` (`--primary`) | Usar tokens CSS existentes |
| Mint | `#5FCF9B` | `#D1F2E5` (`--secondary`) | Usar tokens CSS existentes |

Usar os tokens do codebase garante consistência com o resto do app e respeita o dark mode já implementado.

### 6. Tabelas afetadas

| Tabela | Situação | Ação na Fase 1 |
|--------|----------|----------------|
| `generos` | Existe (81 linhas, mix PT/EN) | Criar view ou seed curado (≈12 gêneros em PT) para o quiz |
| `perfil_preferencias` | **Não existe** | Criar na migration da Fase 1 |
| `usuario_livros` | Existe — é a "estante" | Usada por `seed_estante_inicial` |
| `clube_membros` | Existe | Usada por auto-join pós-signup |
| `perfis.onboarding_completo` | Existe (boolean) | Marcado `true` após merge |

---

## Consequências

### Positivas
- Visitante experimenta o app antes de criar conta → reduz atrito inicial.
- Bug de deep link corrigido → links de clube compartilhados funcionam.
- Todo código novo atrás de `show_onboarding = false` → zero risco de regressão.
- Reutiliza os 48 componentes UI existentes (Button, Card, Progress, Badge) e os 10 clubes públicos já cadastrados.

### Trade-offs / riscos
- O localStorage anônimo pode ser limpo pelo browser (modo privado, expiração) — aceitável; o usuário reinicia o quiz em < 2 min.
- O merge pós-signup exige 3 chamadas sequenciais ao Supabase — tratar falha parcial com retry idempotente.
- `generos` tem 81 entradas em inglês/português misturados; o quiz precisará de uma lista curada separada (não alterar a tabela base).
- Dois fluxos de onboarding coexistindo (`/onboarding` e `/comecar`) durante a transição — documentar e remover `/onboarding` quando `/comecar` estiver validado.

---

## Critério de aceite desta fase (Fase 0)

- [x] Estado atual mapeado (roteamento, design system, tabelas)
- [x] Bug de returnTo localizado (`Login.tsx:28`)
- [x] ADR proposto com rota, máquina de estado e gating
- [ ] **Aprovação do Paulo** → prosseguir para Fase 1 (modelo de dados)
