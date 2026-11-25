# Changelog

Todas as mudanças relevantes do NAMZU são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [versionamento semântico](https://semver.org/lang/pt-BR/). A política de versões e o plano de fases estão em `docs/roadmap.md`.

## [Não lançado]

### Adicionado

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

### Corrigido

- **Datas da trilha um dia antes.** O período de cada livro aparecia com um dia a menos no fuso do Brasil, na Gestão e na aba Leituras. As datas passam a ser lidas como dia, sem hora.
- **Criar encontro falhava.** O tipo padrão do formulário, "Encontro", era recusado pelo banco. Só os outros tipos funcionavam.
- **Respostas "Talvez" e "Não" falhavam.** O banco só aceitava "Vou".
- **Aviso de encontro novo em dobro.** Dois gatilhos avisavam o mesmo encontro e cada membro recebia duas notificações. Fica um só.
- No cartão do encontro, "1 confirmados" passa a "1 confirmado".
- **Notificação de conteúdo novo.** O banco recusava os tipos de notificação `clube_novo_conteudo` e `meta_diaria_lembrete`, usados pelo gatilho de conteúdos do clube e pelo lembrete da meta diária. A lista de tipos aceitos foi corrigida na migração `fase3_cronograma_leitura`.

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
