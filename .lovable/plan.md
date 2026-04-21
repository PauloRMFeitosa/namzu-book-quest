
Plano: criar uma página dedicada de **Cadastro Manual** com três abas — **Obra**, **Autor** e **Edição** — acessível por um botão `+` na página de Busca.

## 1. Acesso
- `src/pages/Busca.tsx`: adicionar botão `+` (ícone `Plus`) no header, ao lado do título "Buscar livros". Também exibir CTA "Cadastrar manualmente" no estado `semResultados`.
- Navega para nova rota `/cadastro-manual` (registrada em `src/App.tsx` dentro do `ProtectedRoute`/`AppLayout`).

## 2. Nova página `src/pages/CadastroManual.tsx`
Componente `Tabs` com 3 abas:

### Aba "Obra"
Campos:
- Título* (input)
- Autor principal* (autocomplete em `autores` por `nome_ordenacao`; se não existir, cria junto)
- Coautores (TagsInput, opcional)
- Ano de publicação (number, opcional)
- Idioma original (select, default `pt-BR`)
- Sinopse (textarea, opcional)
- URL da capa (input + preview, opcional)
- **Status inicial na minha lista** (RadioGroup): Quero ler | Lendo | **Já lido**
- Se "Já lido": data de início, data de conclusão (default hoje), nota (1–5)

### Aba "Autor"
Campos:
- Nome completo*
- (Após salvar, autor fica disponível no autocomplete da aba Obra)

### Aba "Edição"
Campos:
- Obra* (autocomplete em `obras` por título; opção "criar nova" abre aba Obra)
- Título da edição* (default: título da obra)
- Editora*
- Formato* (select: ebook, fisico, audiobook)
- Idioma (default `pt-BR`)
- ISBN-13 (validação 13 dígitos, opcional)
- Nº de páginas (opcional)
- URL da capa (opcional)
- Preço em R$ (opcional, salvo em centavos)

Validação com `zod` em todas as abas. Botões Cancelar | Salvar (loading).

## 3. Backend
Como as tabelas `obras`, `autores`, `obra_autores` e `edicoes` **não permitem INSERT por usuários** (sem RLS de INSERT), toda criação ocorre via edge function com service role.

Estender `supabase/functions/rapid-action/index.ts` aceitando um campo `mode`:
- `mode: "manual_obra"` → cria obra + autores informados + relação `obra_autores` + (opcional) edição inicial; opcionalmente já cria `usuario_livros` com status escolhido (quando `user_id` + `status` vierem). Retorna `obra.id`.
- `mode: "manual_autor"` → cria apenas o autor. Retorna `autor.id`.
- `mode: "manual_edicao"` → cria edição vinculada a `obra_id`. Retorna `edicao.id`.
- Sem `mode` → comportamento atual (busca em APIs externas) preservado.

Validação de duplicidade:
- Obra: `slug` derivado de título; se já existe slug, retorna a existente (upsert atual já faz isso).
- Autor: por `nome_normalizado`.
- Edição: por `isbn_13` quando informado.

Para o `usuario_livros` quando status = "concluido", trigger existente `trg_concluir_livro` concede XP automaticamente.

Autenticação: a função fica com `verify_jwt = false` (já é o caso), mas validamos JWT em código quando o payload pedir vincular `usuario_livros`.

## 4. Pós-cadastro
- Toast de sucesso por aba.
- Aba Obra: opção "Salvar e adicionar outra" + redirecionar para `/livros/:obraId` quando "Salvar e ver".
- Invalidar React Query: `["meus-livros"]`, `["ultimas-leituras"]`.

## Arquivos alterados
- `src/pages/CadastroManual.tsx` (novo)
- `src/components/cadastro-manual/AutorAutocomplete.tsx` (novo, reutilizado nas abas)
- `src/components/cadastro-manual/ObraAutocomplete.tsx` (novo)
- `src/pages/Busca.tsx` (botão `+` e CTA)
- `src/App.tsx` (rota `/cadastro-manual`)
- `supabase/functions/rapid-action/index.ts` (suportar `mode` manual)

## Resultado esperado
- Botão `+` no topo da Busca abre `/cadastro-manual`.
- Usuário cadastra obras, autores e edições isoladamente, com autocompletes para reaproveitar registros existentes.
- Em "Obra", pode marcar como "Já lido" e ganhar XP via trigger existente.
- Sem migrations: toda escrita centralizada na edge function `rapid-action` com service role.
