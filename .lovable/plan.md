## Objetivo
Na página de Busca (`/busca`), exibir todos os livros já cadastrados no acervo (tabela `obras`) por padrão, com opções de ordenação e filtros — mantendo a busca por texto e a busca em fontes externas como hoje.

## Mudanças propostas em `src/pages/Busca.tsx`

### 1. Lista padrão do acervo (sem termo de busca)
Quando o campo de busca está vazio, em vez de mostrar a tela em branco, exibir todas as obras do acervo com paginação (lazy load / "carregar mais", lotes de 30).

Query inicial:
- `obras` join `obra_autores → autores` join `edicoes` (para autor principal e editora).
- Ordem padrão: título A→Z.

### 2. Controles de ordenação
Dropdown "Ordenar por":
- Título (A→Z) — padrão
- Título (Z→A)
- Autor (A→Z)
- Autor (Z→A)

(Usa `titulo_ordenacao` e `autores.nome_ordenacao`.)

### 3. Filtros
Dois selects (ou popovers com busca) abaixo do campo de busca:
- **Autor**: lista distinta de autores presentes no acervo.
- **Editora**: lista distinta de editoras de `edicoes`.

Ambos com opção "Todos". Filtros se combinam (AND) e funcionam tanto sobre o acervo completo quanto sobre o resultado da busca textual local.

### 4. Comportamento da busca textual
- Mantém o fluxo atual (debounce 500ms, busca local; se vazio, busca externa).
- Quando há termo digitado: ordenação e filtros se aplicam apenas à seção "No acervo".
- Quando não há termo: a tela mostra "Acervo" com todas as obras + filtros + ordenação.

### 5. UI
- Cabeçalho: título "Buscar livros" + botão "+" (cadastro manual) — como hoje.
- Campo de busca — como hoje.
- Linha de controles (3 itens compactos): `[Ordenar ▾] [Autor ▾] [Editora ▾]`. Botão "Limpar" aparece quando há filtro ativo.
- Lista renderizada com o `renderCard` existente (mesmo visual).
- Rodapé: botão "Carregar mais" quando há mais resultados.

## Detalhes técnicos
- 3 queries com React Query (`@tanstack/react-query`):
  - `acervo-obras` (paginada por offset, depende de ordenação/filtros).
  - `acervo-autores` (lista distinta para o filtro).
  - `acervo-editoras` (lista distinta para o filtro).
- Para "autor principal" no card, usar `obra_autores` com `ordem = 1` (ou primeiro retornado).
- Filtro por editora: como `editora` está em `edicoes`, fazer `inner join` em `edicoes` quando filtro de editora estiver ativo (`edicoes!inner(editora)` + `eq`).
- Filtro por autor: `obra_autores!inner(autor_id)` + `eq`.
- Ordenação por autor: ordenar via `obra_autores.autores.nome_ordenacao` (usando `order` no select aninhado não é trivial no PostgREST; alternativa: ordenar no client após buscar a página, OU criar uma view materializada `obras_lista` com colunas `titulo_ordenacao`, `autor_principal_ordenacao`, `editora_principal`). Proposta inicial: **ordenar no client** dentro do lote carregado (suficiente para acervos pequenos/médios). Se acervo crescer, criar view depois.
- Sem alterações de schema/RLS — `obras`, `autores`, `obra_autores`, `edicoes` já são públicos para leitura.

## Fora do escopo
- Não altera a página `/livros` (Meus livros).
- Não altera busca externa nem fluxo de adicionar.
