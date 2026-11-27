# Criação do clube e roteiro "Primeiros passos"

Como o organizador é guiado do "criar o clube" até o clube pronto para receber os membros.

## Sequência

1. **Criação do clube** (`/clubes/novo`): identidade, sobre o clube, quem pode entrar e o endereço da página pública. O endereço vem sugerido pelo nome do clube.
2. **A página pública já nasce no ar.** Se o endereço não puder ser usado (outro clube pegou antes), o clube é criado do mesmo jeito e um aviso pede para escolher outro endereço em Painel > Página pública.
3. **Painel do organizador com o roteiro** (`/clubes/:id/painel?novo=1`): o cartão "Primeiros passos" abre com as boas-vindas, no topo da Visão geral.

## Os passos

| # | Passo | Fica feito quando |
|---|---|---|
| 1 | Escolha o primeiro livro | Há um livro na trilha. |
| 2 | Defina o cronograma | O livro atual tem datas de início e fim, ou uma meta. |
| 3 | Marque o primeiro encontro | Há um encontro futuro, uma votação de data aberta ou um encontro já realizado. |
| 4 | Conheça a página pública do clube | A página está no ar e o organizador abriu a seção da página ou copiou o link. Em clube sem página, o passo vira "Publique a página do clube". |
| 5 | Convide os membros | O organizador copiou ou enviou o convite, ou já há um segundo membro ou um pedido de entrada. |
| 6 | Mande o primeiro aviso (opcional) | Há um aviso enviado. |

A ordem é proposital: quem recebe o convite já encontra um clube com livro, data e página.

## Regras

- Os passos se marcam sozinhos, a partir do que existe no clube. Não há botão de "marcar como feito".
- O progresso conta só os cinco passos obrigatórios ("3 de 5 passos"). Com os cinco feitos, o cartão diz que o clube está pronto e mostra só o aviso, que é opcional.
- O cartão some quando os seis passos estão feitos ou quando o organizador toca em "Dispensar". Dá para reabrir em Painel > Configurações.
- Vale para clubes antigos: o organizador vê só o que falta.
- Co-curadores também veem o roteiro.

## O que fica guardado no aparelho

Três marcas ficam no navegador (`localStorage`), por clube: roteiro dispensado, convite gerado e página conhecida. Em outro aparelho, os passos 4 e 5 voltam a se guiar só pelo que existe no clube, e o roteiro dispensado reaparece. Foi a escolha para a primeira versão, por não pedir mudança no banco.

## Convite e página pública

As duas telas explicam a diferença e apontam uma para a outra:

- **Convite:** para quem o organizador já conhece. A pessoa abre o link e entra.
- **Página pública:** para divulgar a quem ainda não conhece o clube. Apresenta o clube e leva ao convite.

## Como medir

- `clube_criado` (com `pagina_publica`), `cronograma_definido`, `encontro_criado`, `votacao_data_aberta`, `pagina_publica_compartilhada`, `convite_gerado` e `aviso_enviado` mostram, por clube, quais passos foram cumpridos e em quanto tempo.
- `roteiro_dispensado` mostra quem dispensou e com quantos passos feitos.

## Código

- Lógica: `src/lib/primeirosPassos.ts` (com testes).
- Cartão: `src/components/clubes/painel-organizador/PrimeirosPassos.tsx`.
- Marcas do aparelho: `src/hooks/clubes/useMarcasDoRoteiro.ts`.
- Criação: `src/pages/clubes/CriarClube.tsx`.
