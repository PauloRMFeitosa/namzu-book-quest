
Vou analisar o pedido e estruturar o plano. O escopo é grande: refatorar toda a página `/leituras` (lista) e criar uma tela de detalhe (`/leituras/:id`) com 3 blocos principais (pré, durante, pós-leitura), todos integrados ao Supabase com as tabelas já existentes.

Pontos de atenção observados no schema:
- `leituras` tem `usuario_livro_id`, `user_id`, `tipo`, `pagina_inicio`, `pagina_fim`, `paginas_lidas`, `percentual_lido`. RLS já configurada (`auth.uid() = user_id`).
- `leitura_pre` referencia `leitura_id` (1:1 lógico).
- `leitura_pos` referencia `usuario_livro_id` (não `leitura_id`) — atenção.
- `leitura_conteudo`, `leitura_citacoes`, `leitura_aplicacoes`, `leitura_links`, `leitura_tags` referenciam `leitura_id`.
- `tags` é compartilhada (sem RLS visível para insert) — precisa verificar policies; `leitura_tags` também sem RLS visível.
- `obras` não tem `num_paginas` — esse campo está em `edicoes`. Para calcular percentual/restantes vou usar `usuario_livros.edicao_id → edicoes.num_paginas`. Se não houver edição vinculada, mostrar só páginas lidas.
- Rota `/leituras/:id` hoje recebe o `usuario_livros.id`. Vou manter essa convenção (a tela é "do livro do usuário", não de uma leitura individual).

Pendência de RLS: `tags`, `leitura_tags`, `leitura_pos` (esta última tem policy ALL via `usuario_livros`), `leitura_pre/conteudo/citacoes/aplicacoes/links` já têm policies via `leituras`. Preciso checar se `tags` e `leitura_tags` permitem INSERT — vou pedir migração se necessário.

Vou apresentar o plano sem questions adicionais — o brief é claro.

---

# Plano: Módulo Leituras (Namzu)

## Visão geral
Refatoração completa de `src/pages/Leituras.tsx`, dividida em componentes para evitar arquivo gigante. A rota `/leituras/:id` continua usando o `usuario_livros.id` como identificador do "livro do usuário".

## Estrutura de arquivos

```
src/pages/Leituras.tsx                      (lista — Lendo + Últimos lidos)
src/pages/LeituraDetalhe.tsx                (orquestra blocos pré/durante/pós)
src/components/leituras/
  ├─ PreLeituraForm.tsx                     (form quando não existe pré)
  ├─ PreLeituraView.tsx                     (exibe pré salva)
  ├─ RegistrarLeituraDialog.tsx             (form de nova leitura tipo='leitura')
  ├─ LeiturasList.tsx                       (lista de leituras já registradas)
  ├─ ProgressoBar.tsx                       (barra + páginas restantes)
  ├─ PosLeituraForm.tsx                     (visível só se status='lido')
  ├─ TagsInput.tsx                          (criação dinâmica de tags)
  └─ DynamicListField.tsx                   (citações/aplicações/links)
src/hooks/leituras/
  ├─ useLeiturasDoLivro.ts                  (agrega leituras + cálculos)
  └─ useUpsertLeitura.ts                    (mutation com transação client-side)
```

## Fluxos principais

### 1. Página `/leituras` (lista)
- Query 1: `usuario_livros` onde `status='lendo'` + join `obras` + `edicoes` (para `num_paginas`).
- Query 2: agregação de `leituras.paginas_lidas` por `usuario_livro_id` (uma única query com `select` + group). Calcula `% = SUM/num_paginas`.
- Query 3: `usuario_livros` onde `status='lido'`, ordenado por `data_fim DESC`, limit 5.
- Renderiza 2 seções com cards (capa, título, barra de progresso, páginas restantes).

### 2. Tela `/leituras/:id`
Carregamento paralelo via React Query:
- `usuario_livros` (com obra+edição)
- `leituras` do livro + filhas (pre, conteudo, citacoes, aplicacoes, links, tags)
- `leitura_pos` (se existir)

Renderiza condicionalmente:

**Bloco A — Pré-leitura**
- Se não existe `leituras` com `tipo='pre_leitura'` para esse `usuario_livro_id` → `<PreLeituraForm>` (intenção obrigatória, domínio prévio, observação). Ao salvar: insere em `leituras` (tipo='pre_leitura', user_id=auth.uid(), usuario_livro_id) e em `leitura_pre` com o id retornado.
- Se existe → `<PreLeituraView>` exibe os campos.

**Bloco B — Leituras (interações)**
- Botão "Registrar leitura" (desabilitado se não há pré-leitura) → abre `<RegistrarLeituraDialog>`.
- Form: resumo, conceito principal, citações (lista), aplicações (lista, cada uma com botão "gerar plano de ação"), tags (input dinâmico), links (tipo+url+descrição), páginas lidas OU %.
- Ao salvar (sequencial, com rollback básico em erro):
  1. insert `leituras` (tipo='leitura', paginas_lidas, percentual_lido)
  2. insert `leitura_conteudo`
  3. insert `leitura_citacoes` (bulk)
  4. insert `leitura_aplicacoes` (bulk, com `plano_acao` JSON)
  5. upsert `tags` por nome + insert `leitura_tags` (bulk)
  6. insert `leitura_links` (bulk)
- Lista abaixo mostra leituras já registradas (cards expansíveis).
- Barra de progresso global: SUM(paginas_lidas) / edicoes.num_paginas.

**Bloco C — Pós-leitura**
- Visível só se `usuario_livros.status === 'lido'`.
- Se não existe `leitura_pos` → form (resumo geral pré-preenchido com concat dos resumos das leituras, ideia principal, resenha, checkboxes spoiler/público).
- Agregações exibidas: todas citações, todas aplicações (cada uma com "gerar plano de ação"), tags unificadas (distinct), links agregados.
- Salvar em `leitura_pos` (referencia `usuario_livro_id`).

### 3. "Gerar plano de ação"
Por ora: gera estrutura JSON simples client-side `{ passos: [...], prazo: null }` derivada do texto da aplicação, salva no campo `plano_acao` (jsonb). Sem chamada de IA nesta primeira versão (pode ser evoluído depois para usar Lovable AI).

## Migração necessária

As tabelas `tags` e `leitura_tags` não têm RLS habilitada/policies — inserts vão falhar. Preciso adicionar:

```sql
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ler tags" ON tags FOR SELECT USING (true);
CREATE POLICY "criar tags autenticado" ON tags FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE leitura_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns leitura_tags" ON leitura_tags FOR ALL
USING (EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_tags.leitura_id AND l.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM leituras l WHERE l.id = leitura_tags.leitura_id AND l.user_id = auth.uid()));
```

Também adicionar índice único em `tags.nome` para permitir upsert por nome:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS tags_nome_unique ON tags (lower(nome));
```

## Detalhes técnicos
- React Query para todas as leituras; invalidação por `["livro", usuario_livro_id]` após cada mutation.
- Validação client-side com `react-hook-form` + `zod` para o form de pré-leitura e registro.
- Cálculo de progresso feito no client a partir do array de leituras (uma única query traz tudo).
- UI: cards (`card-soft`), `Progress` para barra, `Dialog` para registrar leitura, `Accordion` para listar leituras anteriores.
- Mobile-first (viewport atual 768px); grid 1 coluna em mobile, 2 em md+.
- Toda mutation usa `toast.success/error`.
- Regra dura: botão "Registrar leitura" desabilitado e tooltip "Crie a pré-leitura primeiro" se não houver pré.
- Bloco pós-leitura escondido (não renderizado) se `status !== 'lido'`.

## O que NÃO está incluído
- Geração de plano de ação por IA (fica como melhoria futura — apenas estrutura JSON estática agora).
- Edição/exclusão de leituras já registradas (apenas criação e visualização).
- Compartilhamento público da pós-leitura (apenas o flag salvo; feed público fora de escopo).
