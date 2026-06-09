## Visão Geral

Reorganizar `LeituraDetalhe` em 6 blocos verticais com foco em jornada e aprendizado. **Nenhuma tabela nova** — toda a modelagem atual atende.

## Mapeamento de tabelas (reutilização)

| Bloco da nova UI | Tabela(s) existente(s) |
|---|---|
| Cabeçalho | `obras`, `obra_autores`, `autores`, `usuario_livros`, `edicoes`, `usuario_leituras` |
| Progresso | `leitura_progresso` (agregado), `usuario_leituras.status/data_fim` |
| Pré-leitura | `leituras` (tipo `pre_leitura`) + `leitura_pre` |
| Sessões | `leituras` (tipo `leitura`) + `leitura_progresso` apenas |
| Pós-leitura | `leituras` (tipo `pos_leitura`) + `leitura_pos` (resenha, nota via `ideia_principal`/`resenha`) |
| Aprendizados – Insight | `leituras` "container" + `leitura_conteudo` (resumo + conceito_principal) |
| Aprendizados – Aplicação | `leitura_aplicacoes` |
| Aprendizados – Citação | `leitura_citacoes` |
| Aprendizados – Resenha | `leitura_pos.resenha` (uma por livro) |
| Organização – Tags | `leitura_tags` + `tags` |
| Organização – Links | `leitura_links` |
| Timeline | derivada de todas acima por `created_at`/`data_registro` |

**Decisão arquitetural:** Como `leitura_conteudo/citacoes/aplicacoes/links/tags` têm FK para `leituras.id`, criaremos **uma única "leitura container"** por `usuario_leitura` (tipo `leitura`, sem `leitura_progresso`) para abrigar todos os aprendizados standalone do livro. Sessões de leitura passam a ser `leituras` tipo `leitura` que **só** possuem registro em `leitura_progresso`. UI distingue pela presença de progresso. Migração leve no client: ao abrir a página, se existirem sessões antigas com conteúdo misturado, eles continuam visíveis na timeline (compatibilidade preservada). Nenhum dado existente é apagado.

## Bloco 1 — Cabeçalho
Componente `LivroHeader` existente + barra de progresso (`ProgressoBar`). Sem mudanças significativas.

## Bloco 2 — Progresso (novo)
Novo componente `ProgressoBlock`:
- Mostra **página atual**, **última atualização**, barra de progresso
- Botão **"Atualizar progresso"** abre `AtualizarProgressoDialog`
  - Campos: página anterior (readonly, derivada do máximo já registrado), página atual, tempo de leitura (opcional)
  - Calcula `paginas_lidas = pagina_atual - pagina_anterior`
  - Salva: cria nova `leituras` tipo `leitura` + `leitura_progresso` (paginas_lidas, percentual_lido calculado, data_registro=now)
  - Exibe resumo antes de salvar
  - Sem campos de conteúdo

## Bloco 3 — Jornada (novo)
Novo componente `JornadaBlock` com 3 etapas visuais:
- **Pré-leitura** — reusa `PreLeituraForm`/`PreLeituraView` (sem alterações), status auto-calculado
- **Sessões de leitura** — novo `SessoesList`: lista cronológica leve mostrando data, página inicial, página final, páginas lidas, tempo (se houver), observação. Editar/excluir mantém. **Apenas progresso**, sem citações/insights/etc.
- **Pós-leitura** — versão simplificada do `PosLeituraBlock`: ao status≠concluido mostra "Disponível após concluir o livro"; ao concluído, formulário com resumo final, principais aprendizados (`ideia_principal`), resenha, nota e flag recomendaria (mapeados a `leitura_pos`). **Sem** o agregador atual de citações/aplicações/links/tags.

## Bloco 4 — Aprendizados (destaque)
Novo `AprendizadosBlock`:
- Botão principal **"Adicionar conteúdo"** abre menu com 4 opções
- 4 cards-resumo: Insights / Aplicações / Citações / Resenhas — cada um abre lista correspondente
- Forms minimalistas em dialogs separados:
  - `InsightDialog` → grava em `leitura_conteudo` (resumo = "o que aprendi", conceito_principal = "por que foi importante")
  - `AplicacaoDialog` → grava em `leitura_aplicacoes` com categoria salva em `plano_acao.categoria`
  - `CitacaoDialog` → grava em `leitura_citacoes` (+ tags em `leitura_tags`)
  - `ResenhaDialog` → grava/edita em `leitura_pos.resenha` (única por livro)
- Todos os 4 primeiros tipos usam a "leitura container" (criada lazy na primeira gravação)

## Bloco 5 — Organização
Novo `OrganizacaoBlock`:
- **Tags** — listagem agregada de todas tags vinculadas via `leitura_tags`
- **Links** — listagem de `leitura_links`
- **Arquivos** — placeholder ("em breve"); nenhuma tabela atual armazena arquivos anexados

## Bloco 6 — Timeline
Novo `TimelineBlock`:
- Query única que une eventos das tabelas: `leitura_progresso` (sessões), `leitura_conteudo`, `leitura_citacoes`, `leitura_aplicacoes`, `leitura_pre`, `leitura_pos`, status changes (`usuario_leituras.data_fim`)
- Ordenado decrescente por timestamp
- Cada item: ícone + descrição curta + data

## Remoções
- Botão **Copiloto IA** e **Compartilhar** do topo do card
- Tabs do `RegistrarLeituraDialog` (substituído pelos dialogs simples)
- Agregadores no `PosLeituraBlock`
- O componente atual `LeituraExperienciaCard` é substituído por composição dos novos blocos em `LeituraDetalhe.tsx`

## Arquivos

**Novos:**
- `src/components/leituras/jornada/ProgressoBlock.tsx`
- `src/components/leituras/jornada/AtualizarProgressoDialog.tsx`
- `src/components/leituras/jornada/JornadaBlock.tsx`
- `src/components/leituras/jornada/SessoesList.tsx`
- `src/components/leituras/jornada/PosLeituraSimples.tsx`
- `src/components/leituras/jornada/AprendizadosBlock.tsx`
- `src/components/leituras/jornada/dialogs/InsightDialog.tsx`
- `src/components/leituras/jornada/dialogs/AplicacaoDialog.tsx`
- `src/components/leituras/jornada/dialogs/CitacaoDialog.tsx`
- `src/components/leituras/jornada/dialogs/ResenhaDialog.tsx`
- `src/components/leituras/jornada/OrganizacaoBlock.tsx`
- `src/components/leituras/jornada/TimelineBlock.tsx`
- `src/hooks/leituras/useContainerLeitura.ts` (cria/obtém leitura container)
- `src/hooks/leituras/useTimelineLivro.ts`

**Alterados:**
- `src/pages/LeituraDetalhe.tsx` — nova composição
- `src/hooks/leituras/useLivroDetalhe.ts` — selects iguais; helper para separar sessões puras de container

**Mantidos (uso parcial):** `LivroHeader`, `ProgressoBar`, `PreLeituraForm`, `PreLeituraView`, `useLeituraActions`

**Removidos do fluxo principal (não deletados — usados em edição legada):** `LeituraExperienciaCard`, `RegistrarLeituraDialog`, `LeiturasList`, `PosLeituraBlock`

## Responsividade
Layout single-column, mobile-first, `max-w-2xl` no desktop. Mantém PWA/iOS safe areas já vigentes no `AppLayout`.

## RLS e compatibilidade
Nenhuma migração. RLS atual (`leituras`, `leitura_*`, `usuario_leituras`) já cobre todos os inserts/updates/deletes propostos pois operam com `auth.uid()` via FK em `usuario_leituras → usuario_livros.user_id`.

## Relatório final (será entregue após implementação)
Lista de arquivos alterados/criados/removidos, tabelas usadas, decisões e validações de QA.
