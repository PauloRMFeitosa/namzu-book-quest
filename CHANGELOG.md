# Changelog

Todas as mudanças relevantes do NAMZU são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [versionamento semântico](https://semver.org/lang/pt-BR/). A política de versões e o plano de fases estão em `docs/roadmap.md`.

## [Não lançado]

### Adicionado

- **Roteiro "Primeiros passos" do organizador:** depois de criar o clube, o organizador cai no painel com um roteiro de seis passos (primeiro livro, cronograma, primeiro encontro, página pública, convite e, como opcional, o primeiro aviso). Cada passo explica para que serve, leva ao lugar certo e se marca sozinho. Vale também para clubes antigos, que veem só o que falta. Pode ser dispensado e reaberto em Configurações. Ver `docs/primeiros-passos.md`.
- **Endereço da página na criação do clube:** a criação ganhou o bloco "Página do clube", com o endereço sugerido pelo nome, e a página pública já nasce no ar.
- As telas de convite e de página pública explicam a diferença entre as duas e apontam uma para a outra.
- **Página pública do clube:** página aberta, sem login, para o organizador divulgar o clube. Mostra nome, descrição, organizador, número de membros, o livro atual, os livros da trilha e os próximos encontros, com o botão de participar. O organizador escolhe o endereço e liga a página em Painel do organizador > Página pública. Abre em `namzu.com.br/c/<endereco>` e, quando o domínio curinga estiver configurado, em `<endereco>.namzu.com.br` (flag `show_clube_subdominio`, desligada por padrão). Ver `docs/pagina-publica.md`.
- Colunas `endereco` e `pagina_publica` em `clubes` e funções `clube_pagina_publica` e `clube_definir_pagina_publica` (migração `clube_pagina_publica`).
- **Planos do organizador (preparação da Fase 5):** nova seção Admin > Planos para criar e editar planos com preço mensal e anual, dias de teste, limites (membros por clube, clubes, co-curadores e usos de IA) e recursos. Uma tabela mostra os recursos de cada plano e permite marcar na hora; a lista de organizadores mostra o plano de cada um e avisa quando o uso passa do limite. Os planos ainda não bloqueiam nada no app e não há cobrança. Ver `docs/planos.md`.
- Tabelas `planos` e `organizador_planos` e função `admin_planos_organizadores` (migração `planos`), com três planos de partida como rascunho.
- **Visão geral do organizador (Fase 3):** primeira aba do clube para quem organiza. Mostra o próximo encontro com as respostas, o livro atual com quantos concluíram, estão lendo ou não começaram, os pedidos de entrada pendentes e, para cada membro, o progresso no livro, a última atividade no clube e se está parado há 7 dias. Controlada pela flag `show_clube_visao_geral`, ligada por padrão.
- Função `clube_visao_geral` no banco (migração `fase3_clube_visao_geral`), que só responde ao organizador do clube e a admins.
- Testes da lógica da visão geral em `src/lib/visaoGeral.test.ts`.
- **QR code do convite (Fase 3):** a janela "Convidar membros" mostra o QR code do link e permite baixar a imagem, para mostrar no encontro ou imprimir. A biblioteca `qrcode` só é carregada quando a janela abre.
- **Última atividade na aba Membros (Fase 3):** o organizador vê há quantos dias cada membro está ativo no clube e quem está parado há 7 dias. Membros comuns não veem a atividade dos outros.
- **Exportar lista de membros (Fase 3):** o organizador baixa um CSV com nome, usuário, papel, data de entrada, progresso no livro atual, situação da leitura, última atividade, parado e resposta ao próximo encontro. O arquivo abre direto no Excel em português e neutraliza células que começam com sinal de fórmula. Só membros ativos entram na lista.
- Evento de produto `membros_exportados` e canal `qrcode` em `convite_gerado`.
- Testes da geração do CSV em `src/lib/membrosCsv.test.ts`.
- **Cronograma de leitura (Fase 3):** o organizador divide o livro do ciclo em metas com data, uma a uma ou com o atalho "Dividir em semanas". Cada meta pode ter um alvo em % do livro, que o app traduz em página aproximada. A tela fica na Gestão, em cada livro da trilha, e também abre pela Visão geral.
- **Meta atual para o membro (Fase 3):** o cartão do livro na aba Leituras mostra a meta atual, o prazo, onde a pessoa está em relação à meta e o cronograma completo.
- **Meta atual na Visão geral (Fase 3):** quantos membros alcançaram a meta, marca e filtro "Abaixo da meta" e botão "Copiar mensagem para o grupo", com o texto pronto para o WhatsApp.
- **Aviso automático de meta (Fase 3):** todo dia às 9h de Brasília, quem está abaixo da meta recebe uma notificação no app quando faltam 2 dias ou menos para o prazo. Uma vez por meta.
- A trilha da Gestão marca o "Livro do ciclo".
- Tabela `clube_metas_leitura`, funções `clube_salvar_cronograma` e `processar_avisos_meta_clube` e agendamento `avisos-meta-clube` (migração `fase3_cronograma_leitura`).
- Eventos de produto `cronograma_definido` e `mensagem_meta_copiada`.
- Testes da lógica do cronograma em `src/lib/cronograma.test.ts`.
- **Lembrete de encontro (Fase 3):** os membros que não recusaram recebem uma notificação no app 24 h e 1 h antes de cada encontro. O organizador tem o botão "Copiar lembrete para o grupo" no cartão do encontro e na Visão geral, com o texto pronto para o WhatsApp.
- **Lista de presença (Fase 3):** depois que o encontro começa, o organizador marca quem esteve. Quem confirmou já vem marcado. Os membros veem quantas pessoas foram.
- **Ata do encontro (Fase 3):** o organizador registra o que foi conversado e combinado. Só quem faz parte do clube lê.
- Tabelas `evento_presencas` e `evento_atas`, funções `evento_salvar_presenca`, `evento_salvar_ata` e `processar_lembretes_encontro` e agendamento `lembretes-encontro` (migração `fase3_encontros`).
- Eventos de produto `lembrete_encontro_copiado`, `presenca_registrada` e `ata_salva`.
- Testes da lógica dos encontros em `src/lib/encontros.test.ts`.
- **Votação de data (Fase 3):** o organizador propõe de 2 a 6 datas para o próximo encontro, os membros marcam quando podem e o organizador escolhe uma. Ao escolher, o encontro é criado, os membros são avisados e quem votou naquela data já entra como confirmado. A votação aparece na aba Eventos e na Visão geral, com mensagem pronta para o grupo.
- Tabelas `clube_votacoes_data`, `clube_votacao_opcoes` e `clube_votacao_votos` e funções `clube_abrir_votacao_data`, `clube_votar_data`, `clube_encerrar_votacao_data` e `clube_cancelar_votacao_data` (migração `fase3_votacao_data`).
- Eventos de produto `votacao_data_aberta`, `voto_data_registrado` e `votacao_data_encerrada`.
- Testes da lógica da votação em `src/lib/votacaoData.test.ts`.
- **Avisos do organizador (Fase 3):** o organizador escreve um aviso com título e mensagem e todos os membros ativos recebem uma notificação no app. O aviso mais recente aparece em uma faixa no topo do clube, com a lista completa a um toque. O organizador pode copiar o aviso para o grupo e apagar. Limite de 5 avisos por clube a cada 24 horas.
- Tabela `clube_avisos` e função `clube_enviar_aviso` (migração `fase3_avisos`).
- Eventos de produto `aviso_enviado` e `aviso_copiado`.
- Testes da lógica dos avisos em `src/lib/avisos.test.ts`.
- **Co-curador (Fase 3):** o organizador nomeia até 3 membros ativos como co-curadores, na aba Membros. O co-curador faz o dia a dia do clube: visão geral, aprovar e remover membros, livro e cronograma, encontros, presença, ata, votação de data, avisos, canais e conteúdos. Continuam só com o organizador: apagar o clube, mudar nome e visibilidade, nomear ou tirar co-curadores e mexer na própria participação dele.
- Funções `is_clube_dono` e `is_clube_curador` (que passa a incluir o co-curador) e gatilho de exclusão em `clube_membros` (migração `fase3_co_curador`).
- Testes das permissões em `src/lib/papeis.test.ts`.
- **Página "Adicionar obra à trilha":** a inclusão de livro na trilha saiu da janela e virou página própria (`/clubes/:id/trilha/nova`). Mostra a prévia do livro escolhido (capa, autoria, ano, páginas e sinopse), avisa quando o livro já está na trilha e permite já criar as metas semanais do período. O rascunho continua guardado.
- **Capas na inclusão de obra:** a página "Adicionar obra à trilha" mostra o acervo em grade de capas, com título, autoria e ano, como na Busca. O campo de busca filtra por título ou autoria, e os livros que já estão na trilha aparecem marcados.
- **Trilha na própria página:** depois de adicionar um livro, o organizador continua na página, com o formulário limpo, e vê a trilha atual logo abaixo, onde também reordena, remove e monta o cronograma. Assim dá para montar a trilha inteira de uma vez.
- **Criar clube, encontro e conteúdo em página:** as três janelas de criação viraram páginas (`/clubes/novo`, `/clubes/:id/eventos/novo` e `/clubes/:id/conteudos/novo`), com seções numeradas, prévia de como vai aparecer e erro em texto. O encontro passa a recusar data no passado, término antes do início e link sem `https://`; o conteúdo também valida o link. Os rascunhos continuam nas mesmas chaves.
- Peças compartilhadas das páginas de criação em `src/components/criacao/`, hooks `useRascunho` e `useAcessoGestao` e validações em `src/lib/criacao.ts`, com testes.
- **Monitoramento de erros (Fase 0):** o app registra erro não tratado, promessa rejeitada, tela que quebrou e consulta que falhou, de quem está logado. Os registros aparecem agrupados em Admin > Erros do app, com vezes, pessoas, telas, versão e pilha. Falta de rede e outros ruídos são descartados. Sem serviço externo. Detalhes em `docs/monitoramento.md`.
- Tabela `erros_app`, limite de 30 registros por pessoa por hora, função `limpar_erros_app` e agendamento `limpar-erros-app`, que apaga registros com mais de 30 dias (migração `fase0_erros_app`).
- Testes da lógica do monitoramento em `src/lib/monitoramento.test.ts`.
- Regra de projeto no `CLAUDE.md`: fluxo novo de criação é página com rota própria, não janela com formulário.
- Testes da lógica de inclusão em `src/lib/trilha.test.ts`.

### Corrigido

- **Acervo pela metade.** A Busca e a página "Adicionar obra à trilha" carregavam só 500 das 1.024 obras do acervo; metade dos livros não aparecia para escolher. O acervo passa a ser buscado inteiro, em páginas.
- **Clube no celular:** na aba Membros, o ranking com nomes compridos passava da borda da tela e levava a liga semanal junto; na aba Microgrupos, o título e os botões não cabiam na mesma linha. Os nomes agora são cortados com reticências e o cabeçalho de Microgrupos quebra em duas linhas.
- **Datas da trilha um dia antes.** O período de cada livro aparecia com um dia a menos no fuso do Brasil, na Gestão e na aba Leituras. As datas passam a ser lidas como dia, sem hora.
- **Criar encontro falhava.** O tipo padrão do formulário, "Encontro", era recusado pelo banco. Só os outros tipos funcionavam.
- **Respostas "Talvez" e "Não" falhavam.** O banco só aceitava "Vou".
- **Aviso de encontro novo em dobro.** Dois gatilhos avisavam o mesmo encontro e cada membro recebia duas notificações. Fica um só.
- No cartão do encontro, "1 confirmados" passa a "1 confirmado".
- **Notificação de conteúdo novo.** O banco recusava os tipos de notificação `clube_novo_conteudo` e `meta_diaria_lembrete`, usados pelo gatilho de conteúdos do clube e pelo lembrete da meta diária. A lista de tipos aceitos foi corrigida na migração `fase3_cronograma_leitura`.

### Alterado

- **Nova identidade visual (opção B):** logo nova, colorida na entrada, no login, no convite e na página pública, e em uma cor só no cabeçalho do app (`LogoNamzu`). Títulos passam da Fraunces para a Manrope. As cores do guia não mudam, mas ganham função: menta no ícone do destaque das telas de clube, azul-céu no destaque da biblioteca e no trilho do progresso de leitura (`PageHero` com `tom`). A logo vem do SVG original e, no tema escuro, o azul do símbolo troca pelo azul claro do guia (`#88B4D8`). No tema escuro o roxo também clareia. Favicon novo em SVG, que acompanha o tema do navegador, com ícones próprios para o app instalado (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`). O blog usa a mesma logo e o mesmo favicon.
- Depois de criar o clube, o organizador vai para o painel com o roteiro, e não mais para a página do clube com a janela de convite aberta.
- A visão geral do organizador passa a conferir os dados sempre que é aberta, para o roteiro e as pendências refletirem na hora o que acabou de ser feito.
- **Página do clube em uma coluna só:** a barra lateral saiu. No computador ela empurrava o conteúdo das abas para fora do alinhamento da capa e dos avisos; no celular virava uma pilha de cartões depois de cada aba. Os blocos foram para a aba onde fazem sentido: "Pulso coletivo", ranking e liga semanal na aba Membros, "Próximo encontro" no topo do Feed (leva à aba Eventos) e "Quem está online" na aba Canais.
- **Menu do clube mais visível:** a barra de abas ganhou ícones, a aba aberta fica em azul e a barra acompanha a rolagem, presa abaixo do cabeçalho. Cabem até seis itens; quando há mais, ficam Visão geral, Feed, Leituras, Eventos e Membros, e as outras (Canais, Conteúdos, Microgrupos e Gestão) vão para o botão "Mais", que mostra o nome da aba aberta. No celular a barra deixa de rolar para o lado.
- **Aviso, votação de data, canal e microgrupo em página:** as quatro janelas de criação que restavam no clube viraram páginas (`/clubes/:id/avisos/novo`, `/votacao/nova`, `/canais/novo` e `/microgrupos/novo`), com prévia e erro em texto. O canal recusa nome repetido e o microgrupo valida o limite de membros. Com isso, todas as criações do clube seguem a regra de criação em página.
- **Faixa de avisos menor:** o cartão "Avisos para os membros" virou uma faixa de uma linha, para o menu e o conteúdo do clube aparecerem mais cedo na tela.
- **Admin com tela própria:** o Admin saiu do layout do app e passou a ocupar a tela inteira, com menu lateral fixo (recolhível, e em gaveta no celular) e a seção aberta guardada no endereço (`/admin?secao=`). O menu foi reorganizado em Operação, Catálogo e Configuração; as quatro seções de recursos desligados no app (gamificação, missões, conquistas e mapeamento de gêneros) ficam em um grupo recolhido.
- **Painel do Admin:** tela inicial com usuários, ativos na semana, clubes, membros, encontros e acervo; ações por dia; lista do que precisa de atenção (erros, denúncias, pedidos pendentes, clubes parados ou sem uso); e a situação de cada clube.
- **Métricas no Admin:** ações de organizadores e membros por dia e por tipo, e o caminho do clube (criado, convite, entrada de membro, cronograma, encontro, progresso). Antes só dava para ver por consulta no banco.
- **Clubes no Admin:** a lista ganhou organizador, situação (em uso, parado, sem uso, desativado), membros, trilha, ações, última ação e próximo encontro, com busca por organizador e link para o clube.
- Função `admin_painel` no banco (migração `admin_painel`), só de leitura e só para admins.
- Testes da lógica do painel em `src/lib/adminPainel.test.ts`.
- **Painel do organizador (Fase 3):** a gestão do clube ganhou área própria em `/clubes/:id/painel`, em tela inteira e com menu lateral, no mesmo formato do Admin. Seis seções: Visão geral, Membros, Leitura, Encontros, Comunicação e Configurações. O organizador entra pelo botão "Painel do organizador" na página do clube; quem organiza mais de um clube troca de clube pelo menu.
- **O que precisa de atenção no clube:** a Visão geral do painel lista o que o organizador tem a resolver (pedidos de entrada, livro sem meta, encontro por marcar, quem não respondeu, quem está abaixo da meta, membros parados, encontro sem ata ou sem presença), e o menu mostra o número de pendências de cada seção.
- **Histórico do clube:** participação por semana nas últimas 8 semanas e os últimos encontros, com presença e ata. Função `clube_painel_historico` no banco (migração `clube_painel_historico`), só de leitura e só para quem organiza.
- **Comunicação e Configurações:** os avisos enviados ficam em uma lista própria, com copiar e apagar, e os dados do clube aparecem em uma tela de leitura com o botão de editar.
- Moldura compartilhada `CascaDoPainel` para o Admin e o painel do organizador, e testes da lógica em `src/lib/painelOrganizador.test.ts`.
- **Provedor de IA:** `clube-ai` e `leitura-copiloto` passam a chamar a API do Google direto quando o segredo `GEMINI_API_KEY` existe, e continuam no gateway do Lovable enquanto ele não existir. Os modelos podem ser trocados por segredo, sem publicar código. As mensagens de erro deixam de citar o Lovable e de repassar o detalhe técnico para a pessoa. Passo a passo em `docs/ia.md`.
- **`.env` fora do repositório:** as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` passam a vir do projeto do Vercel, onde não estavam cadastradas; a produção dependia do arquivo no repositório. O `.env` entrou no `.gitignore` e o CI usa os valores de `.env.example`.
- `docs/backup.md`: o plano gratuito do Supabase não faz backup automático dos dados. O documento traz as opções e a recomendação para antes do piloto.
- Em "Integrações e logs" do Admin, saíram as subabas de moderação e reputação, cujas tabelas nunca receberam registros. O número "Ativos hoje", que vinha da gamificação, deu lugar aos indicadores do Painel.
- **Página do clube só com o que o membro usa:** as abas Visão geral e Gestão saíram e viraram o painel do organizador. O clube abre no Feed para todos. Links antigos com `?tab=visao` ou `?tab=gestao` levam ao painel.
- As páginas de criação do organizador (obra na trilha, encontro, votação de data e aviso) voltam para o painel, e não mais para a página do clube.
- **Deploys só de produção:** o Vercel deixa de gerar preview para branches e PRs e publica apenas a `main`, para não estourar o limite diário do plano gratuito. O teste manual passa a ser feito em produção.

## [0.3.0] - 2026-11-25

Fase 2 do roadmap: foco. O app passa a se apresentar como plataforma para quem organiza clube de leitura. Entrada pelo clube, menu de três destinos, convite por link, segurança dos clubes, carregamento por rota e medição do uso.

### Segurança

- **Entrada em clube:** pela API, qualquer usuário logado conseguia entrar como ativo em clube privado, sem aprovação, e como moderador. Pedido pendente se aprovava sozinho e banido se reativava. Um gatilho em `clube_membros` passa a aplicar as regras de entrada (migração `fase2_seguranca_clubes`).
- **Clubes privados:** nome e descrição ficavam listáveis por qualquer pessoa, inclusive sem login. Agora só aparecem para o organizador, membros ativos e admins. Eventos, tags e métricas seguem a visibilidade do clube.
- **Mensagens dos canais:** quem estava com pedido pendente ou banido conseguia ler. Agora só membro ativo ou organizador.
- Detalhes, testes e reversão em `docs/runbooks/fase2-seguranca-clubes.md`.

### Corrigido

- **Moderador aprova e recusa pedidos de entrada.** A tela já mostrava os botões, mas o banco ignorava a ação e a tela avisava "Membro aprovado" mesmo assim. Agora a ação funciona.
- As ações da aba Membros passam a avisar quando o banco não aplicou a alteração, em vez de mostrar sucesso.
- Alterar papel e remover membro aparecem só para o organizador e o admin, que são quem pode fazer isso.

### Removido

- Código sem uso: páginas sem rota (`Clubes`, `Index`, `Onboarding`), pasta `src/features/`, `services/clubes.ts`, os índices `components/common` e `components/layout`, `NavLink`, `App.css` e as três imagens antigas de onboarding (4 MB).

### Adicionado

- **Menu de três destinos (Fase 2):** Meu clube, Minha leitura e Perfil. Controlado pela flag `show_navegacao_foco`, ligada por padrão. Desligada, volta o menu antigo com a Home.
- **Página "Meu clube"** na rota `/`: com um clube abre direto nele, com vários mostra a lista, sem nenhum convida a criar o primeiro.
- **Abas de "Minha leitura"** (Lendo, Estante, Citações) e botão "Adicionar livro" no topo dessas três páginas.
- **Seção "Conta" no Perfil**, que substitui o menu "Mais": Configurações, Explorar clubes, Metas, Histórico, Termos, Admin e Sair.
- **"Ver como membro"** para admins, na seção Conta: mostra o app respeitando as flags, como um usuário comum vê. Só muda a interface.
- **Flags novas:** `show_leitores` (desligada por padrão), `show_busca`, `show_livros` e `show_citacoes`. As quatro rotas passaram a usar `FeatureRoute`.
- **Preset "Foco no organizador"** no painel admin. O preset "Padrão completo" desfaz a mudança.
- Testes da lógica de navegação em `src/lib/navegacao.test.ts`.
- **Entrada do organizador (Fase 2):** quem abre o NAMZU sem conta vê uma página pública voltada a quem organiza clube, com "Criar meu clube", "Recebi um convite" e "Entrar". Controlada pela flag `show_entrada_organizador`, ligada por padrão. Ligada, o quiz de onboarding e o Código ME deixam de ser paradas obrigatórias.
- **Página de convite** em `/convite/:id`, pública: mostra nome, capa, organizador, número de membros e leitura do clube. Quem não tem conta faz o cadastro curto e cai dentro do clube. O link antigo `/clubes/:id` leva o visitante para o convite.
- **Convidar membros:** ao criar um clube, o link de convite aparece na hora, com copiar e enviar pelo WhatsApp. O botão "Compartilhar" do clube virou "Convidar".
- Função `clube_convite` no banco (migração `fase2_clube_convite`), que entrega só o cartão público do clube para a página de convite.
- Testes do link de convite em `src/lib/convite.test.ts`.
- **Eventos de produto (Fase 2):** tabela `eventos_produto` (migração `fase2_eventos_produto`) e serviço `registrarEvento`. Sete eventos ligados: `clube_criado`, `convite_gerado`, `membro_entrou`, `progresso_registrado`, `encontro_criado`, `rsvp_respondido` e `roteiro_ia_gerado`. Só usuário logado grava, em nome próprio, e só admin lê. Antes disso nada era medido: o funil de onboarding chamava o Google Analytics, que nunca foi instalado.
- `docs/metricas-produto.md`: eventos, propriedades e consultas de acompanhamento, com a métrica norte. Ponto de partida em 25/11/2026: zero clubes ativos na semana.

### Alterado

- `README.md` reescrito para o posicionamento atual: plataforma para quem organiza clube de leitura, com guia de desenvolvimento e mapa da documentação.
- Home do blog voltada ao organizador, com chamada para criar o clube no app.
- **Carregamento por rota (Fase 2):** cada página virou um arquivo próprio, baixado só quando a rota é aberta. O JavaScript baixado na abertura caiu de 749 kB para 199 kB (gzip). O admin fica em arquivo separado.
- Logo reduzido de 1296 px para 256 px de largura: de 653 kB para 54 kB. O maior uso na tela é 80 px.
- Depois de uma publicação nova, a aba que ficou aberta recarrega sozinha ao pedir um arquivo da versão antiga.
- Os contadores de seguidores e seguindo no Perfil deixam de ser links quando a página de leitores está desligada.
- Cadastro e login mostram de onde a pessoa veio (convite de um clube ou criação de clube) e preservam o destino ao alternar entre as duas telas.
- Ao sair da conta, o usuário volta para a página pública em vez do quiz.
- Quem abre um clube privado sem fazer parte é levado para a página de convite, em vez de ver o cabeçalho do clube.
- Ao entrar em um clube, a tela passa a seguir o status que o banco gravou.
- `src/integrations/supabase/types.ts` regenerado a partir do banco. Estava defasado: faltavam `denuncias_conteudo`, `meta_lembretes_log` e funções recentes.
- A aba Visibilidade do admin passa a usar os mesmos padrões de flag que o app, em vez de assumir "ligado" para toda flag sem registro.

## [0.2.0] - 2026-11-24

Fase 0 do roadmap: fundação. Segurança das funções de borda e do banco, repositório igual à produção, e base de processo.

### Removido
- Dependência `lovable-tagger` e os lockfiles do Bun (`bun.lock`, `bun.lockb`). O projeto passa a ter um único lockfile, o `package-lock.json`, que já era o usado no desenvolvimento e no CI.

### Renomeado
- Pacote de `vite_react_shadcn_ts` para `namzu`.

### Segurança
- `rapid-action` passa a exigir usuário autenticado; `ensure-profiles` cria apenas o perfil de quem chama (backfill geral restrito a admin).
- Migração `20261124173944_fase0_seguranca_funcoes`: revoga o acesso pela API a funções internas de gamificação, cron e triggers, restringe três RPCs a usuários autenticados e fixa `search_path` em 32 funções. Aplicada em produção em 24/11/2026; registro em `docs/runbooks/fase0-seguranca-funcoes.md`.

- Migração `20261124175313_fase0_privacidade_rpcs_leitura`: cinco RPCs de estatísticas de leitura passam a respeitar perfil privado. Aplicada em produção em 24/11/2026.

- Segredo do agendador: `reprocessar-generos`, `reprocessar-obras`, `reprocessar-autores` e `enviar-lembretes-meta` passam a aceitar só o `pg_cron`, com segredo guardado no Vault, ou um admin autenticado. Aplicado em produção em 24/11/2026.

### Alterado
- `rapid-action` no repositório passa a ser o código que roda em produção (o repo tinha uma versão antiga).
- `salvar-progresso-leitura` e `reprocessar-generos` no repositório passam a ser o código publicado, que era mais novo.
- Lista de migrações do repositório igualada à do banco: cinco migrações recuperadas do remoto e uma removida.

### Adicionado
- Auditoria das Edge Functions publicadas contra o repositório (`docs/auditoria-edge-functions-2026-11.md`).
- Edge Function `enviar-lembretes-meta`, que só existia em produção.
- Helper compartilhado de autenticação para Edge Functions (`supabase/functions/_shared/auth.ts`).
- Roadmap por fases para reposicionar o produto como plataforma do organizador de clube de leitura (`docs/roadmap.md`).
- Roteiro de entrevista com organizadores (`docs/descoberta/roteiro-entrevista-organizadores.md`).
- Análise técnica do projeto, benchmark de concorrentes e estimativa de tamanho de mercado (`docs/analise-projeto-2026-11.md`, `docs/benchmark-concorrentes-2026-11.md`, `docs/tamanho-mercado-2026-11.md`).
- CI no GitHub Actions com lint, checagem de tipos, testes e build.
- Modelo de pull request com checklist do projeto.
- Script `npm run typecheck`.

## Histórico anterior

Até novembro de 2026 o projeto não tinha versões nem changelog. O histórico desse período está no `git log` e nos pull requests de 1 a 102.
