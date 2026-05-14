# Gestão de trilha de leituras do clube

Permitir que o curador (e admin) adicione, reordene e remova obras da trilha de leituras de um clube, diretamente pelo painel de Gestão.

## Escopo

- Nova seção **"Trilha de leituras"** dentro da aba **Gestão** do clube.
- Listar obras já cadastradas em `clube_trilhas`, ordenadas por `ordem`.
- Botão **"Adicionar obra"** abrindo dialog com:
  - Busca de obra (autocomplete reaproveitando `ObraAutocomplete`).
  - Campos opcionais: `data_inicio_sugerida`, `data_fim_sugerida`.
- Para cada item da trilha:
  - Capa, título, datas e ordem.
  - Botões **subir / descer** (reordenar `ordem`).
  - Botão **remover** (com confirmação).
- Sem mudanças no schema — `clube_trilhas` já suporta tudo. RLS já permite curador/admin gerenciar.

## Arquivos

**Novos**
- `src/hooks/clubes/useClubeTrilhasGestao.ts` — hooks:
  - `useTrilhasGestao(clubeId)` — lista com join em `obras`.
  - `useAdicionarTrilha(clubeId)` — insert calculando próxima `ordem`.
  - `useRemoverTrilha(clubeId)`.
  - `useReordenarTrilha(clubeId)` — troca `ordem` entre dois itens.
- `src/components/clubes/gestao/TrilhaGestao.tsx` — seção visual.
- `src/components/clubes/gestao/AdicionarObraTrilhaDialog.tsx` — dialog de adicionar.

**Editado**
- `src/components/clubes/gestao/GestaoTab.tsx` — incluir `<TrilhaGestao clubeId={...} />` após o bloco de stats (antes de Top contribuidores).

## Detalhes técnicos

- Reutilizar `ObraAutocomplete` (já existe em `src/components/cadastro-manual/`) para escolher a obra.
- Próxima `ordem` = `max(ordem) + 1` da trilha atual (ou 1).
- Reordenação: trocar valor de `ordem` entre o item alvo e o vizinho via dois `update`.
- Após mutações, invalidar `["clube-trilhas-gestao", clubeId]` e `["clube-leituras", clubeId]` para refletir imediatamente na aba Leituras.
- Toasts de sucesso/erro via `sonner`.

## Fora de escopo

- Edição de datas após adicionado (pode ser feita removendo e reinserindo nesta primeira versão).
- Drag-and-drop (usaremos botões ↑/↓ para simplicidade).
