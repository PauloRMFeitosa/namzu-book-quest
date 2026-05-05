## Objetivo

1. Substituir o campo único de busca por três campos separados (Título, Autor, ISBN) com botão "Buscar" — só dispara a pesquisa quando o usuário clicar.
2. Ao adicionar um resultado externo, gravar primeiro a **obra** (e seus autores) e, em seguida, a **edição** vinculada — em vez de fazer tudo num único upsert.

## Mudanças no frontend (`src/pages/Busca.tsx`)

- Trocar o input único por um bloco com 3 inputs:
  - Título
  - Autor
  - ISBN (numérico)
- Adicionar botão "Buscar" (e "Limpar"). Remover o debounce automático — a busca só roda no submit.
- Validar: pelo menos um dos três campos preenchido; se ISBN, normalizar (remover hífen/espaço) e exigir 10 ou 13 dígitos.
- Manter o "Acervo" exibido enquanto não há busca ativa, e os mesmos cards de resultado.
- Enviar para `search-books` um body estruturado: `{ titulo, autor, isbn }` em vez de `{ query }`.

## Mudanças na edge function `search-books`

- Aceitar body `{ titulo?, autor?, isbn? }` (manter compat. com `query` para não quebrar nada).
- Montar a query do Google Books com operadores: `intitle:`, `inauthor:`, `isbn:` combinados.
- Open Library: usar `title=`, `author=`, `isbn=` separadamente.
- Continuar retornando `{ results: [...] }` sem escrever no banco.

## Mudanças na edge function `rapid-action` (modo busca/auto)

Refatorar o handler padrão (sem `mode`) para fazer a gravação em **duas etapas explícitas e idempotentes**:

1. **Etapa 1 — Obra**
   - Buscar obra existente por `slug` (gerado de título + sourceId) ou por par (título normalizado + autor principal).
   - Se não existir: `insert` em `obras`.
   - Upsert dos autores em `autores` e vínculos em `obra_autores`.
   - Retornar `obra_id`.

2. **Etapa 2 — Edição** (somente se houver dados de edição: ISBN, editora, páginas, etc.)
   - Se `isbn_13` informado: procurar edição existente; se já houver, reutilizar.
   - Caso contrário: `insert` em `edicoes` vinculada à `obra_id`.
   - Retornar `edicao_id`.

3. Resposta:
   ```json
   { "success": true, "obra": { "id": "...", "titulo_original": "...", ... }, "edicao": { "id": "..." } }
   ```

Aceitar também um payload "sob medida" do frontend para registrar a partir de um resultado externo já escolhido (sem nova chamada externa), por exemplo `{ mode: "registrar_resultado", titulo, autores, ano, isbn13, capa_url, editora, num_paginas, idioma, descricao }`. Assim o frontend pode passar exatamente o resultado clicado, evitando uma segunda busca.

## Frontend — `adicionarExterno`

- Trocar a chamada para `rapid-action` para usar `mode: "registrar_resultado"` enviando todos os campos do resultado clicado.
- Continuar inserindo em `usuario_livros` com o `obra_id` retornado.

## Sem alterações necessárias

- Banco/RLS: as tabelas `obras`, `autores`, `obra_autores`, `edicoes` já existem e têm policies adequadas (admin escreve; service role da edge function ignora RLS).
- Página `CadastroManual.tsx` permanece como está.

## Arquivos editados

- `src/pages/Busca.tsx` — UI dos 3 campos + botão; nova chamada à edge.
- `supabase/functions/search-books/index.ts` — aceitar campos separados.
- `supabase/functions/rapid-action/index.ts` — fluxo Obra → Edição em duas etapas e novo `mode: "registrar_resultado"`.
