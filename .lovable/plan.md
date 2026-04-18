
O usuário está pedindo um novo fluxo: buscar local primeiro, e se não encontrar, chamar uma edge function `search-books` que apenas RETORNA resultados externos (sem salvar). O salvamento só ocorre quando o usuário clica em "Adicionar", aí sim usando a `rapid-action` existente.

Hoje temos:
- `rapid-action`: já cria a obra no banco e retorna `{ obra: {...} }`. Erro atual 404 quando não acha.
- `Busca.tsx`: chama direto `rapid-action` no fluxo de busca, o que já persiste antes da escolha do usuário (errado segundo o novo requisito).

Plano de implementação:

## 1. Nova edge function `search-books` (apenas leitura)
Criar `supabase/functions/search-books/index.ts`:
- Recebe `{ query: string }`
- Busca em paralelo no Google Books e Open Library
- Retorna lista normalizada `{ results: [{ titulo, autores: [], ano, capa_url, isbn13, fonte }] }`
- NÃO escreve em banco
- CORS completo (OPTIONS + headers)
- Sem 404 quando vazio: retorna `{ results: [] }` com 200
- `verify_jwt = false` em config.toml

## 2. Ajustar `rapid-action` (já existe localmente)
- Garantir que aceita `{ titulo, autor, isbn13 }` e cria/retorna a obra
- Manter CORS já implementado
- Retornar `{ obra: { id, titulo_original, capa_padrao_url, ... } }`

## 3. Reescrever `src/pages/Busca.tsx`
Fluxo:
1. Input dispara busca a partir de 3 caracteres + debounce 500ms
2. Busca local em `obras` (titulo_ordenacao), `obra_autores→autores` (nome_ordenacao) e `edicoes` (isbn_13)
3. Se houver resultado local → exibe e ENCERRA
4. Se vazio → chama `search-books` via `supabase.functions.invoke`
5. Renderiza cards externos com botão "Adicionar"
6. Ao clicar "Adicionar":
   - chama `rapid-action` com `{ titulo, autor, isbn13 }`
   - pega `obra.id` retornado
   - insere em `usuario_livros` com status `quero_ler`
   - remove o card da lista externa
   - move para a seção "No acervo"
   - toast "Livro adicionado"
7. Estados visuais: digitando (<3 chars), buscando local, buscando externa, sem resultados, resultados externos, adicionando, sucesso
8. Cache por termo, dedupe por ISBN

## 4. config.toml
Adicionar entrada para `search-books` com `verify_jwt = false`.

## Arquivos a alterar
- `supabase/functions/search-books/index.ts` (novo)
- `supabase/functions/rapid-action/index.ts` (ajustes mínimos se necessário)
- `supabase/config.toml` (registrar search-books)
- `src/pages/Busca.tsx` (refatorar fluxo)

## Resultado esperado
- Sem 404 quando API externa não encontra
- Livros externos aparecem como preview, sem persistir
- Persistência só após clique explícito
- Sem duplicação (validação por ISBN/título antes de inserir)
