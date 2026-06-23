# RN-PAY-01 — Posicionamento de paywall e upsell premium

**Módulo:** Monetização  
**Status:** Gancho documentado (UI fora do escopo desta fase)  
**Princípio:** cobrar/vender somente **depois** do valor entregue.

---

## Auditoria — onboarding 100% gratuito

As 6 telas de `/comecar` (Fases 0–3) não contêm nenhum elemento de:

| Categoria | Status |
|-----------|--------|
| Marketplace de clubes | ✅ Ausente — acesso apenas pós-login em `/clubes` |
| Upsell de plano premium | ✅ Ausente |
| Paywall de feature | ✅ Ausente |
| CTA para compra | ✅ Ausente |

O marketplace (`/clubes`) é uma rota protegida (`ProtectedRoute`) — nunca exibida a visitantes anônimos. Permanece **em contexto**: dentro da navegação do app, não na entrada.

---

## Momento "aha" do Namzu

O usuário percebe o valor real quando:

1. **Estante populada** — vê os primeiros 12 livros recomendados (T5 do onboarding).
2. **Primeira sessão de leitura** — cronometra e registra progresso pela primeira vez.
3. **Primeiro post no clube respondido** — troca ideia com outro leitor sobre o mesmo livro.

O upsell deve ocorrer **após** pelo menos um desses momentos, nunca antes.

---

## Ganchos de upsell futuro (não implementados)

### G1 — Stats avançadas (após 5ª leitura registrada)

**Gatilho:** usuário registra a 5ª leitura.  
**Oferta:** "Veja seu ritmo de leitura, meses mais produtivos e tempo médio por gênero."  
**Posição:** banner dismissível na página `/leituras` ou `/historico`.  
**Flag sugerida:** `show_premium_stats`.

### G2 — Desafios de leitura (após 1º clube ativo por 30 dias)

**Gatilho:** usuário completa 30 dias num clube.  
**Oferta:** "Participe de desafios mensais com ranking e medalhas."  
**Posição:** tab "Desafios" dentro da página do clube, bloqueada com lock icon.  
**Flag sugerida:** `show_clube_desafios`.

### G3 — Copiloto de leitura ilimitado (após 3ª pergunta ao AI)

**Gatilho:** usuário usa o copiloto de IA pela 3ª vez.  
**Oferta:** "Perguntas ilimitadas ao copiloto — plano Namzu Pro."  
**Posição:** modal inline no copiloto, após exibir a resposta (não antes).  
**Flag sugerida:** `show_ai_copiloto_pro`.

---

## Regras permanentes

1. **Nenhum upsell nas 6 telas de `/comecar`** — sem exceções.
2. **Nenhum paywall como primeira tela** — o visitante sempre experimenta o app antes de ver qualquer oferta.
3. **Marketplace em contexto** — `/clubes` permanece dentro do app autenticado; nunca como landing page pública.
4. **Lock icon, não redirect** — features premium mostram o que o usuário perderia, não removem o conteúdo abruptamente.
5. **Mensagem de motivo** — toda oferta deve explicar em uma frase o que o usuário ganha, não o que ele paga.
