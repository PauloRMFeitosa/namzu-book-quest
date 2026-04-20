
Plano: adicionar a logo enviada nas telas de Login e Recuperação de Senha (e por consistência, também na de Signup, já que compartilham o mesmo padrão visual com o Onboarding).

Passos:
1. Copiar `user-uploads://logo_260419.png` para `src/assets/logo-namzu.png`.
2. Em `src/pages/Login.tsx`:
   - Importar a logo.
   - Adicionar bloco visual no topo do formulário (acima do título "Entrar"): `<img>` centralizada, ~80–96px, com `rounded-2xl` e leve sombra, seguindo o estilo do Onboarding.
3. Em `src/pages/RecuperarSenha.tsx`:
   - Mesmo tratamento, exibida em ambos os steps (`request` e `verify`) acima do título.
4. Em `src/pages/Signup.tsx` (consistência):
   - Mesmo tratamento acima do título "Criar conta".
5. Acessibilidade: `alt="NAMZU"`.
6. Sem alterações de rotas, lógica ou auth.

Arquivos alterados:
- `src/assets/logo-namzu.png` (novo, copiado do upload)
- `src/pages/Login.tsx`
- `src/pages/RecuperarSenha.tsx`
- `src/pages/Signup.tsx`

Resultado esperado: logo aparece centralizada no topo de Login, Signup e Recuperar Senha, mantendo o layout atual e o espaçamento.
