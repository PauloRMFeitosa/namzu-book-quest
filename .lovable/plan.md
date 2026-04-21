
Plano: nos cards de resultado da busca (`src/pages/Busca.tsx`), substituir o botão único `+` por um menu com duas ações: **"Quero ler"** e **"Já lido"**.

## Mudanças

### `src/pages/Busca.tsx`

1. **Importar** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` de `@/components/ui/dropdown-menu` e ícones `BookmarkPlus` e `CheckCheck` do lucide.

2. **Generalizar as funções de adição** para aceitar `status: "quero_ler" | "concluido"`:
   - `adicionarLocal(obraId, key, status)` → passa `status` no `insert` em `usuario_livros`. Se `status === "concluido"`, também grava `data_fim: new Date().toISOString().slice(0,10)`.
   - `adicionarExterno(b, status)` → mesmo tratamento após criar a obra via `rapid-action`.
   - Mensagens de toast adaptadas: "Adicionado em Quero ler" / "Marcado como lido (+100 XP)".

3. **Atualizar `renderCard`** trocando o `<Button>` único por:
   ```tsx
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <Button size="sm" disabled={busy || done} className="rounded-xl">
         {busy ? <Loader2 className="animate-spin"/> : done ? <Check/> : <Plus/>}
       </Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end">
       <DropdownMenuItem onClick={() => onAdd("quero_ler")}>
         <BookmarkPlus className="w-4 h-4 mr-2"/> Quero ler
       </DropdownMenuItem>
       <DropdownMenuItem onClick={() => onAdd("concluido")}>
         <CheckCheck className="w-4 h-4 mr-2"/> Já lido
       </DropdownMenuItem>
     </DropdownMenuContent>
   </DropdownMenu>
   ```
   `onAdd` passa a ser `(status) => void`.

4. **Invalidações React Query**: já existem (`meus-livros`, `ultimas-leituras`); manter. O trigger `trg_concluir_livro` já concede 100 XP automaticamente quando status = `concluido`.

## Sem mudanças

- Sem alterações de schema, RLS, edge functions ou outras telas.
- Comportamento de busca (local/externo, cache, debounce) preservado.

## Resultado

- Cada card de resultado passa a abrir um menu ao clicar no botão de ação, permitindo escolher entre **Quero ler** (comportamento atual) ou **Já lido** (insere com `status='concluido'` + `data_fim=hoje`, dispara XP).

## Arquivos alterados
- `src/pages/Busca.tsx`
