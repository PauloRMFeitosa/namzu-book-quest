# Divulgação: WhatsApp, Telegram e Instagram

O que o NAMZU faz para o organizador levar o clube para fora do app, e o que cada rede permite.

## O que cada rede permite

| Rede | Publicar sozinho no grupo | Como o NAMZU atende |
|---|---|---|
| WhatsApp | Não há caminho oficial para grupos comuns. Bibliotecas não oficiais arriscam o banimento do número. | Abre o WhatsApp com a mensagem pronta e a pessoa escolhe o grupo. |
| Telegram | Sim, por robô, de graça. Ainda não foi feito. | Por enquanto, link do grupo e imagem para compartilhar. |
| Instagram | Não para contas pessoais. | Imagem pronta para stories e feed. |

## Grupo do clube

- O organizador (ou co-curador) guarda o link de convite do grupo em **Painel > Comunicação > Grupo do clube**. Vale link do WhatsApp (`chat.whatsapp.com`) e do Telegram (`t.me`).
- Os membros ativos veem o botão **Entrar no grupo** na página do clube.
- O link fica na tabela `clube_grupos`, separada de `clubes`, porque só quem já faz parte pode ler. Ele não aparece na página pública nem para quem tem pedido pendente.

## Enviar no WhatsApp

Ao lado de cada "Copiar ... para o grupo" há o botão **Enviar no WhatsApp**, que abre a conversa com a mensagem pronta:

- lembrete do encontro (Encontros e Visão geral);
- mensagem da meta da semana (Visão geral);
- mensagem da votação de data;
- avisos (Comunicação e página do clube).

O componente é `EnviarNoWhatsApp` (`src/components/clubes/shared/`).

## Imagens para compartilhar

- **Encontro:** botão "Compartilhar imagem" no cartão do encontro, para quem organiza. A imagem traz o nome do clube, o título, o dia e a hora.
- **Trilha:** botão "Compartilhar a trilha" em Painel > Leitura. A imagem traz o livro da vez, com a capa, e os próximos três.
- Dois formatos: feed e WhatsApp (1080 x 1350) e stories (1080 x 1920).
- A mensagem que vai junto é editável e leva no fim o link da página pública do clube. Com a página desligada, leva o link de convite, e a imagem mostra só o endereço do site.
- No celular, "Compartilhar imagem e mensagem" abre a tela de compartilhar do aparelho, com WhatsApp, Telegram e Instagram. No computador, a imagem é baixada.

Citação, post do feed e resumo de leituras já tinham imagem própria (`CitacaoShareModal`, `PostShareModal`, `ShareModal`) e continuam como estavam: só o autor compartilha o próprio conteúdo.

## Código

- Grupo: `src/lib/grupoDoClube.ts`, `src/hooks/clubes/useGrupoDoClube.ts`, `src/components/clubes/shared/GrupoDoClube.tsx`.
- Imagens: `src/lib/imagemDeDivulgacao.ts`, `CartoesDeDivulgacao.tsx`, `CompartilharImagem.tsx` e `CompartilharDoClube.tsx`, em `src/components/clubes/shared/`.
- Mensagem editável: `src/lib/mensagemDeDivulgacao.ts`.

## O que ainda não tem

- Robô do Telegram publicando sozinho encontro, lembrete, aviso e livro novo.
- Publicação automática no WhatsApp. Depende de a API oficial permitir e tem custo por mensagem.
- Link e prévia próprios de cada encontro: hoje o encontro leva o link da página do clube.
