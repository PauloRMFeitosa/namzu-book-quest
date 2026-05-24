## Reduzir tamanho de imagens no PostComposer

Aplicar a redução proposta apenas no `src/components/clubes/feed/PostComposer.tsx` (feed dos clubes). `CapaUploader` fica como está.

### Mudanças

Em `imageFileToDataUrl`:
- `maxSize`: `1200` → **`900`** (maior lado da imagem)
- `canvas.toDataURL("image/jpeg", 0.82)` → **`0.72`**

Em `handleFile`:
- Limite de upload: `25 * 1024 * 1024` → **`15 * 1024 * 1024`** e mensagem do toast para "Imagem máxima de 15MB"

### Impacto esperado
- Imagens passam de ~200–400 KB para **~60–120 KB** em base64 dentro de `clube_posts.conteudo`
- Redução de ~60–70% no peso de cada post com imagem
- Perda visual mínima no feed (largura útil ≪ 900px na maioria dos dispositivos)

Nenhuma outra alteração: o fluxo continua sendo base64 inline no markdown, sem Storage, sem migração de posts antigos.