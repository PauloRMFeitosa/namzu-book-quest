## Problema

Na página `/buscar`, ao escolher **"Já lido"** no menu de adicionar (tanto em livros do acervo quanto externos), o INSERT em `usuario_livros` com `status='concluido'` falha e o usuário vê um toast de erro.

A causa não está no frontend — o INSERT está montado corretamente (`user_id`, `obra_id`, `status`, `data_fim`). O problema está na cadeia de funções de gamificação acionada pela conclusão:

- A função `dar_xp` chama `refresh_ranking()` no final
- `refresh_ranking()` executa `refresh materialized view concurrently ranking_clube`
- Esse `REFRESH ... CONCURRENTLY` exige um índice único na materialized view e que a view já tenha sido populada uma vez. Quando isso falha, o erro propaga para o INSERT original e a operação inteira é abortada.

Além disso, o frontend hoje exibe `error.message` cru ao usuário, dificultando identificar o problema. E a operação síncrona em série (rapid-action → insert) no fluxo externo deixa o usuário sem feedback claro de qual etapa falhou.

## Correção

### 1. Backend (migração SQL)

Tornar a gamificação resiliente para que um problema na MV de ranking nunca quebre o fluxo principal de marcar livro como lido:

- Reescrever `refresh_ranking()` para envolver o `REFRESH MATERIALIZED VIEW` em um bloco `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END`, apenas logando via `RAISE NOTICE` em caso de falha (ranking não é crítico para concluir leitura).
- Garantir que a MV `ranking_clube` exista; se não existir, ajustar `refresh_ranking()` para ser no-op silencioso quando a MV estiver ausente (verificar `pg_matviews`).
- Garantir o trigger `trg_concluir_livro` em `usuario_livros` (AFTER UPDATE OF status, AFTER INSERT) — hoje a função existe mas o contexto indica que nenhum trigger está attached; sem o trigger o XP nunca é dado. Criar o trigger e tornar a função tolerante a erros do ranking conforme acima.
- Tornar `dar_xp` defensiva: o `perform refresh_ranking()` no final deve estar dentro de bloco com `EXCEPTION WHEN OTHERS THEN NULL`.

### 2. Frontend (`src/pages/Busca.tsx`)

- Em `adicionarLocal` e `adicionarExterno`, melhorar o tratamento de erro:
  - Logar `error` completo no console (`code`, `message`, `details`, `hint`).
  - Exibir mensagem amigável no toast (não o `error.message` cru).
  - Tratar explicitamente o caso já existente `23505` ("já está na lista") com navegação opcional para `/leituras/:id`.
- Após sucesso ao marcar como concluído, invalidar também `["livro-detalhe"]` e `["meu-livro-obra"]` para refletir em outras telas.

## Arquivos afetados

- Migração SQL nova (corrigir `refresh_ranking`, `dar_xp`, criar trigger `trg_concluir_livro` em `usuario_livros`).
- `src/pages/Busca.tsx` — melhor tratamento de erro nas duas funções `adicionar*`.

## Validação

Após aplicar:
1. Buscar um livro já no acervo → "Já lido" → deve aparecer toast "Marcado como lido (+100 XP)" e o livro aparecer em `/leituras`.
2. Buscar um livro externo → "Já lido" → mesmo comportamento, com obra criada via `rapid-action`.
3. XP do usuário deve incrementar em 100 em `gamificacao_perfis`.
4. Mesmo se a MV `ranking_clube` falhar, a marcação como lido deve concluir com sucesso.
