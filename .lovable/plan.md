## Plano: atualizar logo e favicon usando a nova imagem (sem fundo)

A nova imagem enviada (`Design_sem_nome-2.png`) será usada como logo oficial em todo o app, substituindo o arquivo atual.

### 1. Logo (`src/assets/logo-namzu.png`)
- Copiar `user-uploads://Design_sem_nome-2.png` para `src/assets/logo-namzu.png` (sobrescrevendo).
- Como é PNG com fundo branco visualmente mas o pedido é "sem fundo", vou processar a imagem para tornar o fundo branco transparente antes de salvar (usando Python/Pillow via `code--exec`), garantindo que ela fique limpa sobre qualquer cor de fundo (claro ou escuro).
- Todas as telas que já importam `@/assets/logo-namzu.png` herdam a nova versão automaticamente:
  - `src/pages/Onboarding.tsx`
  - `src/pages/Login.tsx`
  - `src/pages/Signup.tsx`
  - `src/pages/RecuperarSenha.tsx`
  - `src/components/AppLayout.tsx`
- Remover a classe `shadow-elevated` do `<img>` no `Onboarding.tsx` (a sombra atual foi pensada para um card com fundo; sem fundo fica estranho). Manter `rounded-3xl` opcional — vou remover também para o logo aparecer "solto".

### 2. Favicon
- Gerar `public/favicon.png` a partir da mesma imagem com fundo transparente, redimensionada para 256×256.
- Remover `public/favicon.ico` (browsers requisitam `/favicon.ico` por padrão e ele sobrescreveria o novo).
- Atualizar `index.html` adicionando:
  ```html
  <link rel="icon" href="/favicon.png" type="image/png">
  ```

### Processamento da imagem (via script)
Pequeno script Python com Pillow:
1. Abrir a imagem.
2. Converter para RGBA.
3. Tornar transparente todos os pixels quase brancos (threshold ~240).
4. Salvar em `src/assets/logo-namzu.png` (tamanho original) e `public/favicon.png` (256×256).

### Sem mudanças
- Sem alterações em rotas, schema, edge functions ou lógica de UI além do ajuste cosmético no Onboarding.

### Arquivos alterados
- `src/assets/logo-namzu.png` (substituído, fundo transparente)
- `public/favicon.png` (criado, fundo transparente, 256×256)
- `public/favicon.ico` (removido)
- `index.html` (link do favicon)
- `src/pages/Onboarding.tsx` (remover sombra/cantos arredondados do logo)
