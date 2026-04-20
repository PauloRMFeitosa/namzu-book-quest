
Plano: criar um header superior fixo no `AppLayout` exibindo o nome "NAMZU" (sempre) e o slogan "A sabedoria começa aqui !!!" apenas em telas web (≥768px).

Mudanças:

1. `src/components/AppLayout.tsx`
   - Adicionar `<header>` fixo no topo, dentro do mesmo container `max-w-3xl` para alinhar com o conteúdo.
   - Conteúdo:
     - Logo pequena (`src/assets/logo-namzu.png`, ~32px, rounded) + texto "NAMZU" (font-extrabold, text-primary).
     - Slogan "A sabedoria começa aqui !!!" ao lado, com classe `hidden md:inline` (oculto no mobile, visível em web).
   - Estilo: `bg-card border-b border-border shadow-sm`, altura ~56px, sticky no topo.
   - Ajustar `<main>` para ter `pt-` adequado (substituir `pt-6` por algo como `pt-20` para compensar o header fixo) e manter `pb-24` para a bottom nav.

2. Não alterar telas de auth (Login/Signup/Onboarding/RecuperarSenha) — elas não usam `AppLayout`.

Arquivo alterado:
- `src/components/AppLayout.tsx`

Resultado:
- Mobile (<768px): topo com logo + "NAMZU".
- Web (≥768px): topo com logo + "NAMZU" + slogan "A sabedoria começa aqui !!!".
