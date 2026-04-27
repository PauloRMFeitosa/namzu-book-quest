## Objetivo

Quando o usuário clicar em **"Continuar lendo"** na Home ou em um livro na página **Leituras**, deve ir direto para a página de detalhe da leitura pessoal (`/leituras/:id`, que renderiza `LeituraDetalhe`) — onde estão pré-leitura, sessões e pós-leitura — em vez de ir para a página pública da obra (`/obras/:id`).

A página de detalhe da obra (`/obras/:id`) continua sendo o destino quando o clique ocorre em listas de descoberta (Busca, Livros, "Últimas leituras" da Home etc.).

## Mudanças

### 1. `src/pages/Home.tsx` — card "Leitura atual"
- No `onClick` do bloco "Leitura atual", trocar `navigate(\`/obras/${lendo.obra_id}\`)` por `navigate(\`/leituras/${lendo.id}\`)`.
- O botão "Continuar lendo" passa a abrir a leitura pessoal do usuário.
- A seção "Últimas leituras" (carrossel) permanece apontando para `/obras/:id` (descoberta da obra).

### 2. `src/pages/Leituras.tsx`
- Na seção **"Lendo"**: trocar `navigate(\`/obras/${l.obra_id}\`)` por `navigate(\`/leituras/${l.id}\`)`.
- Na seção **"Últimos lidos"**: trocar `navigate(\`/obras/${l.obra_id}\`)` por `navigate(\`/leituras/${l.id}\`)` (também é leitura pessoal do usuário, faz sentido abrir o detalhe da própria leitura com pós-leitura/avaliação).

## Observações

- Nenhuma rota nova precisa ser criada — `/leituras/:id` já existe em `App.tsx` e renderiza `LeituraDetalhe`.
- `LeituraDetalhe` já tem botão "Voltar" (`navigate(-1)`), preservando o fluxo de retorno à página de origem.
- Nenhuma mudança em `Busca.tsx`, `Livros.tsx` ou no carrossel "Últimas leituras" da Home — esses contextos continuam levando à página da obra.
