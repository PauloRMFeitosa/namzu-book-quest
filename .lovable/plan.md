
Plano: substituir o filtro atual da página `Livros` (3 abas fixas) por **4 chips de filtro** com a opção adicional "Todos".

## Mudanças em `src/pages/Livros.tsx`

1. Remover `Tabs/TabsList/TabsTrigger/TabsContent` e usar um filtro horizontal de chips (Buttons com variante toggle).
2. Adicionar estado `const [filtro, setFiltro] = useState<"todos"|"lendo"|"quero_ler"|"lido">("todos")`.
3. Calcular lista filtrada:
   - `todos` → `data` (todos os registros)
   - `lendo` → `status === "lendo"`
   - `quero_ler` → `status === "quero_ler"`
   - `lido` → `status === "lido" || status === "concluido"`
4. Mostrar contagem ao lado de cada chip: `Todos (12)`, `Lendo (3)`, `Quero ler (5)`, `Lidos (4)`.
5. Renderizar um único `<Grid items={filtrados} />` abaixo dos chips.
6. Manter empty state e estilo de cards inalterados.

## Layout dos chips
- Container `flex gap-2 overflow-x-auto` (rola horizontal no mobile 375px).
- Chip ativo: `bg-primary text-primary-foreground`; inativo: `bg-muted text-foreground`.
- `rounded-full px-4 h-9 text-sm font-medium`.

## Sem mudanças
- Sem alterações de schema, queries Supabase ou rotas.
- Componente `Grid` interno preservado.

## Arquivo alterado
- `src/pages/Livros.tsx`

## Resultado
- 4 filtros: **Todos | Lendo | Quero ler | Lidos**, com contagem; default "Todos" exibe o acervo completo.
