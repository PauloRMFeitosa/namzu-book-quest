# RN-QA-01 — Checklist de QA dos 8 princípios do onboarding

**Módulo:** Onboarding `/comecar`  
**Status:** Implementado (Fases 0–7)

---

## Os 8 princípios e seus critérios testáveis

### P1 — Mostrar o resultado

> Primeira tela é a estante pronta + stats, não cadastro.

| Critério | Como testar | Status |
|----------|-------------|--------|
| T1 não tem formulário de cadastro | Acessar `/comecar` sem sessão; confirmar ausência de input de e-mail/senha | ✅ |
| T1 mostra estante demo (12 livros) e stats | Inspecionar componente `TelaBoasVindas` | ✅ |
| T1 é acessível sem sessão (rota pública) | Acessar `/comecar` em aba anônima do browser | ✅ |

---

### P2 — Parecer humano

> Copy conversacional em PT-BR, não formulário.

| Critério | Como testar | Status |
|----------|-------------|--------|
| Todas as telas usam copy em PT-BR, sentence case | Revisar textos das 6 telas | ✅ |
| T4 usa pergunta direta ("O que te traz pro Namzu?") | Navegar até T4 e ler o título | ✅ |
| Sem termos técnicos expostos ao usuário | Revisar labels, toasts e mensagens de erro | ✅ |

---

### P3 — Personalização

> Quiz de gosto cedo (gêneros, 3 livros, ritmo, objetivo).

| Critério | Como testar | Status |
|----------|-------------|--------|
| T2 coleta gêneros (multi-select) | Selecionar gêneros em T2 e confirmar em `onboardingStore` | ✅ |
| T3 coleta até 3 livros via busca | Buscar título em T3; selecionar; confirmar no store | ✅ |
| T4 coleta objetivo (3 opções) | Selecionar objetivo em T4; confirmar no store | ✅ |
| Dados persistem no reload (localStorage) | Avançar para T3, recarregar; confirmar que T3 é mostrada | ✅ |

---

### P4 — Resultado personalizado

> Devolve estante + clubes + trilha na hora (endowment).

| Critério | Como testar | Status |
|----------|-------------|--------|
| T5 chama `match_clubes_por_gosto` com gêneros reais | Completar quiz; inspecionar requisição em DevTools | ✅ |
| T5 mostra até 3 clubes com nome e descrição | Verificar que `clubes.length > 0` e os cards são renderizados | ✅ |
| T5 mostra até 12 livros das `obra_generos` | Verificar grid de capas | ✅ |
| Skeleton é exibido durante carregamento | Throttle de rede no DevTools; confirmar pulse animation | ✅ |

---

### P5 — Paywall depois do valor

> Nada de marketplace/premium no onboarding.

| Critério | Como testar | Status |
|----------|-------------|--------|
| Nenhuma menção a plano pago nas 6 telas | `grep -r "premium\|pago\|plano" src/components/onboarding/` → zero resultados | ✅ |
| `/clubes` (marketplace) não é acessível sem auth | Acessar `/clubes` sem sessão → redireciona para `/comecar` | ✅ |
| Marketplace aparece só no app autenticado | Verificar que `/clubes` está dentro de `ProtectedRoute` em `App.tsx` | ✅ |

---

### P6 — Fluxo longo parece curto

> Barra de progresso, 1 pergunta/tela, botão "Pular", micro-recompensa.

| Critério | Como testar | Status |
|----------|-------------|--------|
| Barra de progresso visível em T2, T3 e T4 | Navegar para cada tela; confirmar `ProgressoOnboarding` | ✅ |
| Barra avança de 1/3 → 2/3 → 3/3 | Conferir `pct` calculado no componente | ✅ |
| Botão "Pular" disponível em T2, T3 e T4 | Verificar renderização de cada tela | ✅ |
| Micro-recompensa toast após T2 | Selecionar gêneros e continuar; confirmar toast "+N livros ✦" | ✅ |
| Toast de livro adicionado em T3 | Selecionar livro; confirmar toast com título | ✅ |

---

### P7 — Ensinar em contexto

> Dicas na 1ª vez que cada feature é usada; sem tour.

| Critério | Como testar | Status |
|----------|-------------|--------|
| Nenhuma dica durante o onboarding | Completar as 6 telas; confirmar que `namzu_dicas` está vazio | ✅ |
| Dica após 1ª leitura registrada | Limpar `namzu_dicas`; registrar leitura; confirmar toast de dica | ✅ |
| Dica após 1º clube entrado | Limpar `namzu_dicas`; entrar em clube; confirmar toast | ✅ |
| Dica após 1ª curtida | Limpar `namzu_dicas`; curtir post; confirmar toast | ✅ |
| Cada dica aparece só uma vez | Repetir a ação; confirmar que dica não reaparece | ✅ |

---

### P8 — Pedir na hora certa

> Conta na penúltima tela; notificação amarrada a motivo.

| Critério | Como testar | Status |
|----------|-------------|--------|
| Pedido de conta só na T6 (não antes) | Navegar até T5; confirmar ausência de form de cadastro | ✅ |
| T6 oferece Google OAuth e e-mail | Acessar T6; confirmar dois botões | ✅ |
| Notificação só pedida ao entrar no 1º clube | Limpar `namzu_dicas`; entrar em clube; confirmar toast "Avisar?" | ✅ |
| Motivo visível no pedido de notificação | Conferir texto do toast: "Avisar quando houver novidades neste clube?" | ✅ |
| Notificação nunca pedida no onboarding | Completar /comecar sem criar conta; confirmar ausência do toast | ✅ |

---

## Funil de analytics (eventos instrumentados)

| Evento | Onde | Props |
|--------|------|-------|
| `onboarding_iniciado` | T1 carrega | — |
| `onboarding_etapa_concluida` | T2, T3, T4 avança | `etapa`, `total_generos` / `total_livros` / `objetivo` |
| `onboarding_etapa_pulada` | T2, T3, T4 pula | `etapa` |
| `onboarding_resultado_visto` | T5 carrega | — |
| `onboarding_signup_iniciado` | T6 carrega | — |
| `onboarding_signup_concluido` | Após criar conta | `metodo_signup` |
| `onboarding_abandonado` | `beforeunload` em T2–T5 | `etapa` |

---

## A11y — critérios testados

| Item | Implementação | Status |
|------|--------------|--------|
| `prefers-reduced-motion` | `motion-reduce:transition-none` na barra de progresso | ✅ |
| Foco visível em chips de gênero | `focus-visible:ring-2 focus-visible:ring-primary` | ✅ |
| Foco visível em cartões de objetivo | `focus-visible:ring-2 focus-visible:ring-primary` | ✅ |
| `aria-pressed` em seleções | `QuizGeneros` e `QuizObjetivo` | ✅ |
| `aria-label` em botão remover | `QuizLivros` — "Remover" | ✅ |
| `role="progressbar"` com `aria-valuenow` | `ProgressoOnboarding` | ✅ |
| Navegação por teclado (Tab + Enter/Space) | Testar manualmente em cada tela | ✅ |
| Contraste mínimo 4.5:1 | `--primary` `#1A3B8B` sobre branco → ratio 8.1:1 | ✅ |

---

## Testes de integração (executar manualmente)

### T1 — Quiz anônimo → signup → estante populada
1. Acessar `/comecar` em aba anônima
2. Selecionar 3 gêneros → 2 livros → objetivo "Descobrir"
3. Ver T5 (estante + clubes)
4. Criar conta com e-mail em T6
5. **Esperado:** estante com ≥ 1 livro; ≥ 1 clube em `/clubes`; `perfil_preferencias` inserido no banco

### T2 — Reentrada no meio do quiz
1. Avançar até T3
2. Fechar o browser e reabrir `/comecar`
3. **Esperado:** T3 é mostrada com o mesmo estado (gêneros já selecionados)

### T3 — Usuário já autenticado acessa `/comecar`
1. Fazer login normalmente
2. Acessar `/comecar` diretamente
3. **Esperado:** redirecionamento imediato para `/`

### T4 — Flag `show_onboarding = false`
1. Desativar a flag no admin
2. Acessar o app como visitante anônimo
3. **Esperado:** redirecionamento para `/login` (não `/comecar`)

### T5 — Deep link após Google OAuth
1. Acessar `/clubes/[id]` sem sessão
2. Ser redirecionado para `/comecar`
3. Autenticar com Google
4. **Esperado:** retorno para `/clubes/[id]` após OAuth
