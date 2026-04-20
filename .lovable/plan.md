
Adicionar a logo `src/assets/logo-namzu.png` na tela de Onboarding, substituindo o ícone atual `BookOpen` dentro do quadrado primário.

Mudanças em `src/pages/Onboarding.tsx`:
- Importar `logoNamzu from "@/assets/logo-namzu.png"`.
- Remover o import de `BookOpen` (não usado mais).
- Substituir o bloco `<div className="w-24 h-24 rounded-3xl bg-primary ..."><BookOpen/></div>` por `<img src={logoNamzu} alt="NAMZU" className="w-24 h-24 rounded-3xl shadow-elevated object-cover" />`, mantendo o mesmo tamanho/visual das demais telas de auth (porém um pouco maior, 24 vs 20, conforme já era no Onboarding).

Sem mudanças de rota, lógica ou textos.

Arquivo alterado:
- `src/pages/Onboarding.tsx`
