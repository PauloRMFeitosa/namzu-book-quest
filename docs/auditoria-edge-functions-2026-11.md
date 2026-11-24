# Auditoria — Edge Functions publicadas x repositório

**Data:** 24/11/2026 · **Fase:** 0 do `docs/roadmap.md` · **Projeto Supabase:** `qiiuvlmauztjitflqcfd`

**Por que foi feita:** ao publicar a proteção da `rapid-action`, descobrimos que o código em produção era diferente do repositório. Esta auditoria confere as demais funções.

**Método:** o código publicado foi lido com a ferramenta do Supabase e extraído por script da resposta bruta, sem cópia manual, e comparado com o repositório por `diff`. Uma função idêntica byte a byte (`reprocessar-obras`, 576 linhas) confirma que a extração é fiel. Tudo aqui foi feito só com leitura, exceto uma chamada sem credencial à `enviar-lembretes-meta`, que hoje não envia nada.

## Resultado por função

| Função | Publicada em | Resultado | Ação |
|---|---|---|---|
| `rapid-action` | 24/11 (v33) | Igual ao repo, exceto 2 correções de estilo | Nenhuma |
| `ensure-profiles` | 24/11 (v15) | Igual ao repo | Nenhuma |
| `reprocessar-obras` | 08/07 (v2) | **Igual**, byte a byte | Nenhuma |
| `conciliar-obra` | 08/07 (v1) | Equivalente: 2 linhas diferentes sem efeito (escape de regex e um comentário) | Nenhuma |
| `salvar-progresso-leitura` | 03/07 (v15) | **Diferente. Produção é mais nova** | Código de produção trazido para o repo neste PR |
| `reprocessar-generos` | 12/06 (v7) | **Diferente. Produção é uma reescrita** | Código de produção trazido para o repo neste PR; falha de segurança em aberto |
| `reprocessar-autores` | 08/06 (v2) | **Diferente. Repo é mais novo** | Repo mantido; falta publicar |
| `enviar-lembretes-meta` | 31/08 (v1) | Só existia em produção | Trazida para o repo neste PR |
| `clever-api` | 19/04 (v3) | Só existe em produção. Sem nenhum chamador | Candidata a remoção |
| `buscar-livros` | 18/04 (v2) | Só existe em produção. Sem chamador. **Código ilegível** | Candidata a remoção |
| `search-books`, `admin-create-user`, `admin-manage-user`, `admin-list-users`, `obra-estatisticas`, `clube-ai`, `leitura-copiloto`, `conciliar-autor` | 08/06, em lote | **Não foi possível ler** | Pendente; ver seção 3 |

A configuração `verify_jwt` de todas as funções bate com `supabase/config.toml`.

## 1. Achados, por gravidade

### 1.1 `reprocessar-generos` aberta para a internet — ALTA
A versão publicada não confere quem chama. Qualquer pessoa pode disparar o lote, que grava em `obras`, `edicoes`, `generos` e `obra_generos` com a chave de serviço e consome a cota do Google Books. O `pg_cron` a chama a cada 6 horas sem credencial, e é por isso que ela ficou aberta. A versão do repo exigia admin, mas publicá-la derrubaria o agendador.

A versão publicada também faz mais do que a do repo: preenche sinopse, capa e ano em `obras` e editora, páginas e capa em `edicoes`. Em compensação, não registra a execução em `integracoes_execucoes`, que a versão do repo registrava.

### 1.2 `reprocessar-obras` com o lote aberto — MÉDIA
Mesma classe do item anterior, mas por decisão registrada no código: só o modo de uma obra específica exige admin. O lote grava candidatos do Wikidata e pode ser disparado por qualquer pessoa.

### 1.3 `enviar-lembretes-meta` aberta — MÉDIA, sem efeito hoje
A checagem do segredo é opcional no código e a variável `LEMBRETES_CRON_SECRET` não está definida: uma chamada sem credencial devolveu 200. Hoje a função não envia nada, porque as chaves de e-mail (Resend) e de push (VAPID) não estão configuradas e não há nenhuma meta diária cadastrada. Se as chaves forem configuradas sem corrigir isso, qualquer pessoa poderá disparar os envios.

### 1.4 Job diário de `reprocessar-autores` falha toda madrugada — MÉDIA
A função exige admin em todos os modos, e o `pg_cron` a chama sem credencial. O log de 24/11 às 03:00 UTC mostra 401. O job não processa nada, provavelmente desde junho. O `pg_cron` registra "sucesso" porque só mede o envio da requisição.

Há ainda uma diferença de regra: em produção o autor é aceito automaticamente com pontuação a partir de 80; no repo, a partir de 90. O repo é o mais novo e nunca foi publicado.

### 1.5 Segredo em texto puro no agendador — BAIXA
O comando do job `lembretes-meta-diaria-email-push` em `cron.job` traz um token no cabeçalho. Como a função ignora o token (item 1.3), ele hoje não protege nada. Ao corrigir, o segredo deve ir para o Vault do Supabase.

### 1.6 Funções mortas expostas — BAIXA
`buscar-livros` e `clever-api` não têm chamador no app, no agendador nem no banco, e não aparecem nos logs recentes. São protótipos de abril, anteriores à `search-books`. A `buscar-livros` roda código que não conseguimos ler, sem exigir login. A `clever-api` repassa buscas ao Google Books e grava a resposta inteira no log.

### 1.7 Observação sobre o `pg_net`
O `pg_net` desiste da resposta em 5 segundos, mas as funções de lote levam cerca de 65 segundos e continuam rodando. O resultado real só aparece nos logs da função. Em 24/11 às 06:02 a `reprocessar-generos` estourou o limite de execução (status 546).

## 2. O que este PR sincroniza no repositório

Nada disto altera produção.

- `salvar-progresso-leitura`: passa a ser o código publicado, que trata o erro de oito chamadas ao banco. A versão antiga do repo respondia sucesso mesmo quando o progresso não era gravado.
- `reprocessar-generos`: passa a ser o código publicado, com duas correções de estilo sem efeito no comportamento. **A falha 1.1 vem junto, porque é o que está no ar.**
- `enviar-lembretes-meta`: adicionada, com registro em `supabase/config.toml`.
- Cinco migrações que só existiam no banco, extraídas de `supabase_migrations.schema_migrations`: `20260706162759`, `20260706213217`, `20260715134456`, `20260831143635` e `20260831143924`.
- Removida a `20260810153000`, que só existia no repo. Ela espelhava à mão o que a `20260706162759` real já faz.

Com isso a lista de migrações do repo é idêntica à do banco: 75 de cada lado, conferido por consulta.

## 3. Pendências que dependem de decisão

1. **Fechar os endpoints de lote** (itens 1.1 a 1.5). Proposta: um segredo único de agendador, guardado no Vault do Supabase e nas variáveis das funções. O lote passa a aceitar admin autenticado ou o segredo; os jobs do `pg_cron` passam a enviá-lo. Exige publicar quatro funções e alterar quatro jobs.
2. **`reprocessar-autores`:** publicar a versão do repo (limite 90) junto com o item 1, para o job voltar a funcionar.
3. **Remover `buscar-livros` e `clever-api`** pelo painel do Supabase. Não há ferramenta para remover função por aqui.
4. **Ler as 8 funções ilegíveis.** Elas foram publicadas em lote em 08/06 por um caminho que não guardou o código de forma recuperável. Dois caminhos:
   - baixar com `supabase functions download <nome>`, o que exige um token de acesso da conta;
   - republicar a partir do repo, o que sobrescreve o que está no ar sem sabermos o que havia lá. Não recomendado às cegas.
5. **Registro de execução da `reprocessar-generos`:** decidir se a tela de jobs do admin deve voltar a receber esses registros, que a versão publicada deixou de gravar.
