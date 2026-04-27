## Objetivo

Aprimorar a tela `/leituras/:id`, permitir edição da pré-leitura, edição/exclusão da pós-leitura e habilitar ditado por áudio (speech-to-text) em todos os campos de texto/textarea.

## 1. Tela `/leituras/:id` — melhorias

A página `LeituraDetalhe.tsx` já existe com capa, status, progresso, pré-leitura, sessões e pós-leitura. Vamos reforçar:

- **Cartão de progresso destacado** no topo: páginas lidas / total, páginas restantes, percentual e barra grande.
- **Botão "Continuar leitura"** (ação primária no topo, sempre que `status = lendo`) que abre direto o `RegistrarLeituraDialog` para registrar nova sessão.
- **Resumo de marcações**: contadores rápidos (citações, aplicações, tags, links) somando todas as sessões, com âncora para a seção correspondente.
- **Seção "Marcações"** consolidada acima da lista de sessões: mostra últimas citações (com pg) e tags acumuladas, em modo somente leitura, para acesso rápido.
- Manter a lista expandível de sessões (já existente) abaixo.

## 2. Edição da pré-leitura

Hoje `PreLeituraView` é apenas leitura. Vamos:

- Adicionar botão **"Editar"** no cartão de pré-leitura.
- Criar componente `PreLeituraEditForm` (ou reutilizar `PreLeituraForm` com props `mode="edit"` + valores iniciais + `leituraId`) que faz `update` em `leitura_pre` pelo `leitura_id`.
- Após salvar, invalida `livro-detalhe`.

## 3. Edição e exclusão da pós-leitura

`PosLeituraBlock` já edita os campos via `update`/`insert`. Falta:

- Botão **"Excluir pós-leitura"** quando `pos?.id` existe → `AlertDialog` de confirmação → `delete from leitura_pos where id = pos.id` → invalida cache e volta ao formulário em branco.
- Garantir que o "Salvar" funciona como atualização quando já existe (já funciona) e deixar claro o modo (badge "Editando" vs "Novo").

## 4. Ditado por áudio em todos os campos de texto

Componente reutilizável `<DictationButton onTranscript={(text) => ...} />` que pode ser embutido ao lado de qualquer `Input`/`Textarea`.

### Estratégia técnica

Usar **ElevenLabs Scribe (batch)** via edge function para transcrever áudio gravado no navegador.

**Fluxo:**
1. Usuário clica no botão de microfone → `MediaRecorder` grava áudio (webm/opus).
2. Ao parar, envia o blob para edge function `transcrever-audio`.
3. Edge function chama `https://api.elevenlabs.io/v1/speech-to-text` com `model_id=scribe_v2`, `language_code=por`.
4. Retorna `{ text }` → componente chama `onTranscript(text)` que **anexa** ao valor atual do campo.

### Componente `DictationButton`

- Estados: `idle`, `recording`, `transcribing`.
- Visual: ícone `Mic` (idle) / `Square` vermelho pulsante (recording) / spinner (transcribing).
- Tamanho `icon` `sm`, posicionado como botão flutuante no canto inferior direito do textarea (ou ao lado de inputs).

### Wrapper `<TextareaWithDictation>` e `<InputWithDictation>`

Compõem o `Textarea`/`Input` shadcn + `DictationButton` posicionado absolutamente, recebendo `value` + `onChange` e atualizando com `value + " " + transcript`.

### Aplicar nos seguintes locais

- `PreLeituraForm` (intencao, dominio_previo, observacao) e nova edição de pré.
- `PosLeituraBlock` (resumo_geral, ideia_principal, resenha).
- `RegistrarLeituraDialog` (resumo, conceito, citações, aplicações, descrição de link).

## 5. Backend (Supabase)

### Secret necessário

- `ELEVENLABS_API_KEY` — precisa ser adicionado pelo usuário antes da implementação funcionar. Vou solicitar via tool `add_secret` na fase de execução.

### Edge function `transcrever-audio`

- Aceita `multipart/form-data` com campo `file` (audio blob).
- Chama ElevenLabs Scribe (`scribe_v2`, `language_code=por`).
- Retorna `{ text }`.
- Configurada como `verify_jwt = true` em `supabase/config.toml` (apenas usuários autenticados).

## 6. Arquivos afetados

**Novos:**
- `src/components/audio/DictationButton.tsx`
- `src/components/audio/TextareaWithDictation.tsx`
- `src/components/audio/InputWithDictation.tsx`
- `src/components/leituras/PreLeituraEditForm.tsx` (ou refator no Form existente)
- `supabase/functions/transcrever-audio/index.ts`

**Editados:**
- `src/pages/LeituraDetalhe.tsx` — cartão de progresso destacado, botão "Continuar leitura", seção de marcações.
- `src/components/leituras/PreLeituraView.tsx` — botão Editar + alternar para form de edição.
- `src/components/leituras/PreLeituraForm.tsx` — usar inputs com ditado.
- `src/components/leituras/PosLeituraBlock.tsx` — botão Excluir + AlertDialog + ditado nos textareas.
- `src/components/leituras/RegistrarLeituraDialog.tsx` — ditado nos textareas/inputs principais.
- `supabase/config.toml` — registrar a função.

## Observações

- O usuário precisará **adicionar a chave `ELEVENLABS_API_KEY`** nos secrets para o ditado funcionar; será solicitado durante a implementação.
- Caso o usuário prefira usar a Web Speech API nativa do navegador (sem custo, mas com suporte limitado e sem português em alguns navegadores), me avise antes de aprovar e ajusto o plano para remover ElevenLabs.
