## Objetivo

Unificar visualmente os blocos **Pré-leitura**, **Sessões de leitura** e **Pós-leitura** em **um único card grande** vinculado ao `usuario_leitura_id` da página `LeituraDetalhe`. Os botões de pré e pós passam a abrir os formulários **inline** (expandir/recolher dentro do próprio card), no mesmo padrão de fluxo do "Registrar leitura".

## Mudanças

### 1. `src/pages/LeituraDetalhe.tsx`
- Envolver os 3 blocos (Pré, Sessões, Pós) em um único container `card-soft` com um cabeçalho identificando a leitura (status + progresso resumido).
- Remover renderização direta de `PreLeituraForm` / `PreLeituraView` / `PosLeituraBlock` no nível atual e passá-los como filhos desse card unificado, divididos por `Separator`.
- Cada seção (Pré / Sessões / Pós) recebe um sub-cabeçalho com ícone + título + botão de ação à direita.

### 2. `src/components/leituras/PreLeituraView.tsx` e `PreLeituraForm.tsx`
- Quando **não existir** pré-leitura: mostrar apenas um botão "Adicionar pré-leitura" (com ícone `Plus`/`Sparkles`). Ao clicar, expande o `PreLeituraForm` abaixo (toggle local com `useState`). Botão "Cancelar" recolhe.
- Quando **existir**: mostrar resumo (como hoje) + botões editar/excluir; o modo edição já é inline.
- Remover wrappers de card duplicado dentro do form/view (já estarão dentro do card pai). Trocar `card-soft p-4` por um wrapper mais leve (`p-3 rounded-xl bg-muted/30` ou apenas `flex flex-col gap-2`).

### 3. `src/components/leituras/PosLeituraBlock.tsx`
- Adicionar estado `expanded` controlando exibição do formulário.
- Estado inicial: `expanded = !!pos` (se já existe pós, mostra aberto; senão mostra apenas botão "Adicionar pós-leitura").
- Botão de toggle no cabeçalho.
- Manter os blocos auxiliares (citações, aplicações, tags, links agregados) sempre visíveis dentro do card.
- Remover o `card-soft` externo do form principal (idem item 2).

### 4. Seção de Sessões
- Permanece com o componente `LeiturasList` + `RegistrarLeituraDialog` (botão "Registrar leitura" continua abrindo dialog, conforme já funciona — não pediu mudança aqui).
- Apenas reaproveitar o cabeçalho dentro do card unificado.

## Estrutura visual resultante

```
┌─ Card único (usuario_leitura) ─────────────────┐
│ [Capa + título + status + progresso]            │
│ ───────────────────────────────────────────     │
│ ✨ Pré-leitura            [+ Adicionar / ✎ 🗑]  │
│   (resumo OU form inline expandido)             │
│ ───────────────────────────────────────────     │
│ 📖 Sessões de leitura     [+ Registrar]         │
│   (LeiturasList accordion)                      │
│ ───────────────────────────────────────────     │
│ 🏆 Pós-leitura            [+ Adicionar / 🗑]    │
│   (form inline expandido OU placeholder)        │
│   + Citações / Aplicações / Tags / Links        │
└─────────────────────────────────────────────────┘
```

## Detalhes técnicos

- Não há mudança de schema nem de queries — `useLivroDetalhe` continua retornando `leituras` com tipos `pre_leitura` / `leitura` / `pos_leitura`, todos vinculados ao mesmo `usuario_leitura_id`.
- O agrupamento é puramente de UI.
- O `Separator` usado entre seções: `<div className="h-px bg-border" />` ou `@/components/ui/separator`.
- Botões "Adicionar" seguem o estilo `variant="outline" className="rounded-2xl"` para coerência com o resto do app.

## Fora de escopo

- Não alterar lógica de salvamento, RLS, ou edge functions.
- Não alterar o dialog `RegistrarLeituraDialog`.