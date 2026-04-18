
Situação atual:
- Eu não criei outra função no projeto atual.
- O código de `src/pages/Busca.tsx` já está chamando a função existente `rapid-action` diretamente em `https://qiiuvlmauztjitflqcfd.supabase.co/functions/v1/rapid-action`.
- O repositório nem possui `supabase/functions/rapid-action` localmente hoje, então não há uma segunda função ativa no código daqui.

O problema real:
- A busca local está funcionando.
- Quando não encontra no banco, a tela tenta chamar `rapid-action`.
- Essa chamada falha antes mesmo de receber resposta, com `TypeError: Failed to fetch`.
- Pelos logs e requests, isso é consistente com problema de CORS/preflight na edge function existente no Supabase, não com erro de renderização da página.

Evidências:
- As queries em `obras` e `obra_autores` retornam 200 normalmente.
- O POST para `/functions/v1/rapid-action` aparece como `Failed to fetch`.
- A UI então cai no toast “Erro ao conectar com a função (CORS?)” e mostra “Nenhum livro encontrado.”
- Para termos já presentes no banco, como “Dom Casmurro”, o card aparece normalmente, o que confirma que a parte local está ok.

O que vou corrigir quando você aprovar:
1. Ajustar `src/pages/Busca.tsx`
- Manter o uso da função `rapid-action` existente.
- Melhorar o estado de erro para não mostrar “Nenhum livro encontrado” quando houve falha de conexão/CORS.
- Separar claramente:
  - nenhum resultado local
  - buscando fontes externas
  - erro ao consultar fontes externas
  - resultado externo encontrado

2. Tornar a integração mais robusta
- Revisar o payload enviado para `rapid-action` para casar exatamente com o contrato da função.
- Revisar o parsing do retorno para aceitar os formatos reais que ela devolve.
- Garantir cache por termo e evitar repetição de chamadas com falha.

3. Corrigir a edge function `rapid-action` no Supabase
- Adicionar/validar suporte completo a CORS:
  - resposta para `OPTIONS`
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Headers` incluindo `authorization`, `apikey`, `content-type` e headers do Supabase client
  - incluir headers CORS também em respostas de erro
- Se necessário, ajustar o retorno para o frontend consumir sem ambiguidade.

4. Validar o fluxo completo
- Buscar um termo fora da base e confirmar que:
  - aparece “Buscando em fontes externas…”
  - aparecem cards externos quando a função responder
  - ao adicionar, cria em `usuario_livros`
- Revalidar um termo já existente no banco para garantir que o fluxo local continua intacto.

Detalhe técnico importante:
- Hoje o bloqueio principal não parece estar em `Busca.tsx`, e sim na função remota já implantada no Supabase.
- Como estou em modo somente leitura, eu não consigo editar/deployar essa função agora.
- Assim que você aprovar, eu vou corrigir sem criar uma função paralela: vou manter `rapid-action` e ajustar o frontend + a própria função remota conforme necessário.

Arquivos/áreas a mexer após aprovação:
- `src/pages/Busca.tsx`
- `supabase/functions/rapid-action/index.ts` (ou recriar localmente o espelho da função para editar/deployar corretamente, sem mudar o endpoint usado pela app)

Resultado esperado após a correção:
- A página continuará buscando localmente primeiro.
- Quando não houver resultado local, usará a `rapid-action` existente.
- Livros externos voltarão a aparecer na interface.
- O usuário não verá mais falso “Nenhum livro encontrado” em caso de erro de conexão da função.
