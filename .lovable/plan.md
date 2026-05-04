# Migração para a nova modelagem de leitura

## Objetivo
Trocar todo o controle de "leitura ativa" de `usuario_livros.status` para `usuario_leituras`, usando RPCs (`criar_usuario_leitura`, `iniciar_leitura`, `registrar_progresso`, `finalizar_leitura`) e cálculo de progresso via `leitura_progresso`.

## Conceito
- `usuario_livros` = item da estante do usuário (1 por edição/obra).
- `usuario_leituras` = uma experiência de leitura (releituras geram novos registros). Liga-se ao `usuario_livro_id` e opcionalmente a `clube_id`.
- `leituras` = sessões dentro da experiência (`pre_leitura`, `leitura`, `pos_leitura`), ligadas a `usuario_leitura_id`.
- `leitura_progresso` = registros granulares de páginas/percentual por sessão.

## Mudanças por arquivo

### Hook `src/hooks/leituras/useLivroDetalhe.ts` (refatoração central)
- Renomear/redefinir para receber `usuarioLeituraId` (id de `usuario_leituras`) em vez de `usuarioLivroId`.
- Buscar `usuario_leituras` + join com `usuario_livros(*, obras(*), edicoes(...))`.
- Buscar `leituras` por `usuario_leitura_id` (em vez de `usuario_livro_id`).
- Remover campos `paginas_lidas`/`percentual_lido` de `leituras` (não existem mais nessa tabela). Substituir por agregação de `leitura_progresso` (sum por `leitura_id`).
- `leitura_pos` agora é por `leitura_id` (sessão tipo `pos_leitura`), não por `usuario_livro_id`.
- `calcularProgresso`: soma `leitura_progresso.paginas_lidas` de todas as sessões `tipo='leitura'` da experiência; total = `edicoes.num_paginas`.

### `src/pages/Leituras.tsx`
- `useLivrosLendo`: trocar query para
  ```
  from('usuario_leituras')
    .select('id, status, data_fim, clube_id, usuario_livros!inner(id, obra_id, obras(titulo_original, capa_padrao_url), edicoes(num_paginas))')
    .eq('status','lendo')
  ```
  filtrando `user_id` via join (`usuario_livros.user_id = auth.uid()`).
- Agregar páginas via `leitura_progresso` joinando `leituras.usuario_leitura_id IN (...)`.
- `useUltimosLidos`: idem, `status in ('concluido')` ordenado por `data_fim`.
- Navegar para `/leituras/:usuarioLeituraId`.

### `src/pages/LeituraDetalhe.tsx`
- `id` agora é `usuarioLeituraId`.
- `updateStatus`:
  - "Começar" → criar via RPC se ainda não existir, ou apenas marcar `status='lendo'`.
  - "Concluir" → `supabase.rpc('finalizar_leitura', { p_usuario_leitura_id: id })`.
- Passar `usuarioLeituraId` (não `usuarioLivroId`) para componentes filhos.

### `src/pages/Home.tsx`
- "Lendo agora" e contagens passam a vir de `usuario_leituras` filtrando via join `usuario_livros.user_id = auth.uid()` e `status='lendo'`.
- Últimos concluídos: `usuario_leituras.status='concluido'` ordenando por `data_fim`.

### `src/pages/Livros.tsx` (estante)
- Continua listando `usuario_livros` (estante), MAS o status visual ("lendo/lido/quero ler") deve vir do estado mais recente de `usuario_leituras` daquele `usuario_livro_id` (LEFT JOIN). Quando não houver experiência, status = `quero_ler`.
- Botão "Começar leitura" → cria `usuario_leituras` via RPC e navega para `/leituras/:novoId`.

### `src/pages/Busca.tsx` e `src/pages/CadastroManual.tsx`
- "Adicionar à estante" continua inserindo em `usuario_livros` (sem `status`).
- "Começar a ler agora" → após inserir `usuario_livros`, chamar `rpc('criar_usuario_leitura', { p_usuario_livro_id, p_tipo_origem:'individual', p_clube_id:null })` e redirecionar para `/leituras/:id`.
- Remover gravação de `status='lendo'` em `usuario_livros`.

### `src/pages/ObraDetalhe.tsx`
- Igual à busca: "Adicionar à estante" cria `usuario_livros`; "Começar leitura" chama RPC `criar_usuario_leitura`.
- Substituir consultas que usam `usuario_livro_id` em leituras por `usuario_leitura_id` agregando via `leitura_progresso`.

### `src/components/leituras/PreLeituraForm.tsx`
- Receber `usuarioLeituraId`.
- Criar sessão via `rpc('iniciar_leitura', { p_usuario_leitura_id, p_tipo:'pre_leitura' })` e depois inserir em `leitura_pre`.

### `src/components/leituras/PreLeituraView.tsx`
- Apenas trocar prop `usuarioLivroId` → `usuarioLeituraId` para invalidação de cache.

### `src/components/leituras/RegistrarLeituraDialog.tsx`
- Receber `usuarioLeituraId`.
- Criar sessão via `rpc('iniciar_leitura', { p_usuario_leitura_id, p_tipo:'leitura' })`.
- Em vez de salvar `paginas_lidas`/`percentual_lido` em `leituras`, chamar `rpc('registrar_progresso', { p_leitura_id, p_paginas, p_percentual })`.
- Modo edição: `update` em `leitura_progresso` da sessão (mais recente) ou inserir novo registro de progresso.
- Filhos (`leitura_conteudo`, `leitura_citacoes`, etc.) continuam ligados a `leitura_id`.

### `src/components/leituras/LeiturasList.tsx`
- Trocar prop `usuarioLivroId` → `usuarioLeituraId`.
- Mostrar `paginas_lidas` agregadas a partir de `leitura_progresso` (já vindo do hook).

### `src/components/leituras/PosLeituraBlock.tsx`
- `leitura_pos` agora referencia `leitura_id` (sessão `pos_leitura`).
- Ao salvar: garantir que existe uma `leituras` do tipo `pos_leitura` (criar via `iniciar_leitura` se faltar) e gravar `leitura_pos` com `leitura_id`.
- Botão habilitado somente quando `usuario_leituras.status='concluido'`.

### `src/App.tsx`
- Rota `/leituras/:id` continua, mas o `:id` agora é `usuarioLeituraId`.

## Validações
- Bloquear criação de sessão sem `usuario_leitura_id`.
- Bloquear `pos_leitura` se `usuario_leituras.status !== 'concluido'`.
- Todas as RPCs já usam `auth.uid()` internamente.

## RLS / Banco
- As RPCs e tabelas já existem (vistas em `<db-functions>` e schema). Não há migração nova necessária.
- Se faltar policy de INSERT em `usuario_leituras` para o usuário (hoje a tabela está sem RLS visível), avaliar adicionar policies "user owns via usuario_livros". **Confirmar com o usuário se devo criar essas policies.**

## Itens fora do escopo
- Reaproveitamento de dados antigos onde `leituras` foi gravada com `usuario_livro_id` legado: serão migradas separadamente se solicitado.
