# Página pública do clube

Página aberta, sem login, para o organizador apresentar o clube e convidar novos leitores.

## Endereços

Cada clube tem um **endereço** escolhido pelo organizador (por exemplo `leitoras-do-cariri`). A mesma página abre em dois lugares:

| Endereço | Situação |
|---|---|
| `namzu.com.br/c/leitoras-do-cariri` | Funciona sempre que a página está no ar. |
| `leitoras-do-cariri.namzu.com.br` | Depende do domínio curinga no Vercel e da flag `show_clube_subdominio` (ver abaixo). |

Regras do endereço: letras minúsculas, números e hífen, de 3 a 40 caracteres, sem começar ou terminar com hífen. Cada endereço pertence a um clube só. Nomes como `www`, `admin`, `blog` e `api` são reservados; a lista fica em `ENDERECOS_RESERVADOS` (`src/lib/enderecoClube.ts`) e na função `clube_endereco_reservado` do banco, e as duas precisam andar juntas.

Mudar o endereço faz os links antigos pararem de funcionar.

## Como o organizador usa

Clube novo já nasce com a página no ar: o endereço é escolhido na criação do clube (`docs/primeiros-passos.md`). Para mudar, desligar ou publicar a página de um clube antigo, Painel do organizador > Página pública (`/clubes/:id/painel?secao=pagina`):

1. Escolhe o endereço (o painel sugere um a partir do nome do clube).
2. Liga "Página no ar" e publica.
3. Copia o link ou manda pelo WhatsApp.

Só quem criou o clube e admins mudam o endereço e ligam ou desligam a página. Co-curador vê a situação, sem editar. Desligada, o endereço mostra "clube não encontrado" e continua reservado para o clube.

## O que a página mostra

- Nome, descrição, objetivo, categoria e capa do clube.
- Nome e foto do organizador e o número de membros ativos.
- O livro que o clube está lendo e os livros da trilha (até 24), com a marca de "já lido".
- Data e título dos próximos três encontros.
- O botão de participar, que leva à página de convite (`/convite/:id`). Ela cuida do cadastro e da entrada.

A página **não** mostra lista de membros, conversas, avisos, conteúdos, nem o link ou o local dos encontros.

Clube privado pode ter página pública. O botão vira "Pedir para entrar" e a entrada continua passando pela aprovação do organizador.

## Subdomínio

Quando o site é aberto por `<endereco>.namzu.com.br`, o app inteiro vira a página pública daquele clube, em qualquer caminho (`enderecoDoHost` em `src/lib/enderecoClube.ts`, usado em `src/App.tsx`). Os botões levam para `namzu.com.br`, porque o login fica guardado por endereço e não acompanha o subdomínio.

Para o subdomínio funcionar em produção:

1. Adicionar o domínio `*.namzu.com.br` ao projeto `namzu` no Vercel. O domínio já usa os servidores de nome do Vercel, que é a condição para o certificado curinga.
2. Conferir que `https://<algum-endereco>.namzu.com.br` abre a página.
3. Ligar a flag `show_clube_subdominio` em Admin > Visibilidade. Só então o painel mostra o endereço curto ao organizador.

Em desenvolvimento, `http://<endereco>.localhost:8080` faz o mesmo papel.

## Prévia no WhatsApp e em outras redes

Ao colar o link do clube no WhatsApp, Telegram, Facebook, LinkedIn e parecidos, aparece o nome do clube, a descrição e a capa.

- O app é montado no navegador, então o robô que busca a prévia só veria o título genérico. O `vercel.json` manda os pedidos desses robôs para a função `api/pagina-clube.ts`, que lê a página pública no banco e responde uma página pequena com esses dados.
- Vale para `namzu.com.br/c/<endereco>` e para `<endereco>.namzu.com.br`.
- Quem é robô é decidido pelo `user-agent`. Navegador de gente e o robô do Google não passam pela função.
- Imagem da prévia: a capa do clube; sem capa, a capa do livro atual; sem nenhuma, a imagem do NAMZU.
- A função roda na borda do Vercel (`runtime: "edge"`), para responder rápido: o WhatsApp desiste da prévia quando a resposta demora e mostra só o endereço.
- A resposta fica guardada por 5 minutos e, depois disso, a cópia guardada ainda é servida na hora, por até um dia, enquanto uma nova é buscada. Além disso, o WhatsApp guarda a prévia de um link por conta própria: depois de mudar a capa ou a descrição, a prévia antiga pode continuar aparecendo por um tempo em conversas onde o link já foi colado.
- Clube com a página desligada ou endereço que não existe mostram a prévia genérica do NAMZU.
- A função usa as mesmas variáveis do app no Vercel (`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Os testes da função e das regras do `vercel.json` ficam em `src/lib/previaDoClube.test.ts`.

Para conferir o que o WhatsApp recebe, peça o link com o `user-agent` dele:

```bash
curl -s -A "WhatsApp/2.23.20.0" https://namzu.com.br/c/<endereco> | grep "og:"
```

Para forçar o WhatsApp a buscar a prévia de novo em uma conversa onde o link já foi colado, acrescente um parâmetro qualquer ao link, como `?v=2`.

O link de convite (`/convite/:id`) ainda não tem prévia própria.

## Mensagem que vai com o link

Em Painel > Página pública e na janela de convite há o campo "Mensagem que vai com o link". O organizador escreve o texto e o botão do WhatsApp manda o texto com o link no fim. O texto fica guardado no aparelho, por clube (`mensagem-pagina-{clubeId}` e `mensagem-convite-{clubeId}`), enquanto for diferente do padrão. A lógica está em `src/lib/mensagemDeDivulgacao.ts`.

## O que ainda não tem

- **Relação com os planos:** a página e o subdomínio estão no catálogo de recursos (`pagina_publica` e `endereco_namzu`), mas os planos ainda não bloqueiam nada. Hoje todo clube pode publicar a página.
- **Domínio próprio do organizador** (`clubedafulana.com.br`) e **personalização** (cores, textos, tirar a marca NAMZU).
- **Contagem de visitas.**

## Banco

Migração `*_clube_pagina_publica.sql`:

- `clubes.endereco` e `clubes.pagina_publica`.
- `clube_pagina_publica(p_endereco)`: o que a página mostra. Funciona sem login e só responde para clube ativo com a página ligada.
- `clube_definir_pagina_publica(p_clube_id, p_endereco, p_ativa)`: define o endereço e liga ou desliga. Só para quem criou o clube e admins.

## Código

- Lógica do endereço: `src/lib/enderecoClube.ts` (com testes).
- Consultas: `src/hooks/clubes/usePaginaPublica.ts`.
- Página: `src/pages/clubes/PaginaPublicaClube.tsx`.
- Seção do painel: `src/components/clubes/painel-organizador/PaginaPublicaDoPainel.tsx`.
