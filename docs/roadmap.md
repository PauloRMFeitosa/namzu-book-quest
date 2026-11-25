# Roadmap NAMZU — do app de leitura à plataforma do organizador de clube

**Status:** proposta para aprovação de Paulo · **Criado em:** 24/11/2026 · **Documento vivo:** revisar ao fim de cada fase.

**Base:** `docs/analise-projeto-2026-11.md` (diagnóstico técnico), `docs/benchmark-concorrentes-2026-11.md` (concorrentes) e `docs/tamanho-mercado-2026-11.md` (tamanho do mercado no Brasil e no Nordeste).

---

## 1. Decisão estratégica

O NAMZU deixa de competir como rede social de leitura e passa a ser **a ferramenta de quem organiza clubes de leitura**. O lado individual (estante, progresso, citações) continua existindo como **app do membro**, a serviço do clube.

**Por quê**

- Depois de meses no ar, só um usuário registra leitura. Rede social gratuita depende de efeito de rede, e Skoob, Goodreads e Fable já o têm.
- No mercado de clubes quem paga é o organizador (Bookclubs, clubedolivro.app, LiteraClub cobram dele).
- Um organizador traz o grupo inteiro e dá ao grupo um motivo recorrente para abrir o app: o encontro.
- O blog do NAMZU já fala com bookfluencers e organizadores. O produto é que estava apontado para outro público.

**Posicionamento em uma frase**

> NAMZU é o painel do organizador de clube de leitura: membros, encontros, cronograma e mediação com IA em um lugar só, no lugar da planilha e do grupo de WhatsApp sem memória.

**Cliente-alvo (hipótese a validar na Fase 1)**

| Prioridade | Perfil | Por que |
|---|---|---|
| 1 | Mediador ou criador de conteúdo com clube de 20+ membros, pago ou não | Tem a dor operacional mais forte e, quando cobra mensalidade, tem receita para pagar pela ferramenta. Hoje usa Hotmart + WhatsApp + planilha. |
| 2 | Clube de amigos, família ou empresa (5 a 15 pessoas) | Baixa disposição a pagar. Serve de plano gratuito e canal de divulgação. |
| 3 | Escolas, bibliotecas, programas corporativos de leitura | Ciclo de venda longo. Só depois da versão 1.0. |

**Diferencial contra o clubedolivro.app** (concorrente direto, R$ 19,90/mês): eles entregam logística. O NAMZU entrega logística **mais mediação**: progresso real de cada membro, roteiro de discussão e resumo do encontro por IA, citações e insights do grupo.

**Métrica norte:** clubes ativos por semana. Um clube é ativo quando pelo menos 3 membros registraram atividade (progresso, post, RSVP ou citação) nos últimos 7 dias.

---

## 2. Visão geral das fases

| Fase | Nome | Entrega | Versão | Estimativa* |
|---|---|---|---|---|
| 0 | Fundação | Segurança, repo igual à produção, CI, versionamento | 0.2.0 | 2 a 3 semanas |
| 1 | Descoberta | 10 entrevistas com organizadores e protótipo validado | sem versão | 2 a 3 semanas, em paralelo com a Fase 0 |
| 2 | Foco | App reposicionado: entrada pelo clube, resto desligado por flag | 0.3.0 | 1 a 2 semanas |
| 3 | Painel do organizador | MVP do painel e app do membro enxuto | 0.4.0 | 4 a 6 semanas |
| 4 | Piloto | 3 a 5 clubes reais por 8 semanas, decisão de seguir ou ajustar | 0.4.x | 8 semanas |
| 5 | Monetização | Plano pago do organizador e clube pago com PIX | 1.0.0 | 3 a 4 semanas |
| 6 | Crescimento | WhatsApp, PWA com push, diretório público, segmento institucional | 1.x | contínuo |

\* Estimativas para um desenvolvedor em dedicação parcial. Servem para ordenar, não como compromisso.

Cada fase tem um **critério de saída**. Não se inicia a fase seguinte sem cumpri-lo. As Fases 1 e 4 têm **critério de parada**: se não forem atingidos, o plano é revisto antes de investir mais código.

---

## 3. Fase 0 — Fundação (versão 0.2.0)

**Objetivo:** produção segura e reproduzível antes de convidar clubes de terceiros.

**Segurança**
- [x] Exigir usuário autenticado em `rapid-action`; `ensure-profiles` cria só o perfil de quem chama, com backfill geral restrito a admin. Publicado em 24/11/2026.
- [x] Revogar `EXECUTE` de `anon` nas funções `SECURITY DEFINER` apontadas pelo advisor. Restam 5 exceções justificadas no runbook. Aplicado em 24/11/2026.
- [x] Funções internas que recebem `p_user_id` (`conceder_xp`, `desbloquear_conquista`, `registrar_progresso_missao`, `creditar_xp_clube`, `calcular_matches`) sem acesso pela API. `seed_estante_inicial` já validava o chamador. Aplicado em 24/11/2026.
- [x] RPCs de leitura que recebem `p_user_id` (`get_stats_leitura`, `get_generos_lidos`, `get_livros_por_mes`, `calcular_streak_leitura`, `get_interacoes_diarias`) passam a respeitar perfil privado. Aplicado em 24/11/2026.
- [x] Proteger os endpoints de lote chamados pelo cron com segredo guardado no Vault. As quatro funções aceitam só o agendador ou um admin. Aplicado em 24/11/2026 (`docs/runbooks/fase0-segredo-agendador.md`).
- [x] Fixar `search_path` em 32 das 34 funções. As 2 restantes são SQL imutáveis e ficaram de fora de propósito. Aplicado em 24/11/2026.
- [ ] Ativar proteção contra senha vazada no Auth.
- [ ] Confirmar que as variáveis `VITE_*` estão cadastradas na Vercel; só então tirar `.env` do git e incluí-lo no `.gitignore`. Depende de Paulo: o conector da Vercel não tem acesso ao time do projeto. O arquivo só guarda a URL e a chave pública, então o risco de mantê-lo é baixo.

**Reprodutibilidade**
- [ ] Gerar baseline do schema com `supabase db pull`.
- [x] Trazer para o repo as 5 migrações que só existiam no remoto e remover a `20260810153000`, que só existia no repo. A lista de migrações do repo é idêntica à do banco desde 24/11/2026.
- [x] `rapid-action`: o repo tinha uma versão de junho, diferente da que roda em produção. O código de produção foi trazido para o repo em 24/11/2026.
- [x] Conferir as edge functions contra o que está publicado. Resultado em `docs/auditoria-edge-functions-2026-11.md`: `salvar-progresso-leitura` e `reprocessar-generos` sincronizadas a partir de produção.
- [x] Ler as 8 funções publicadas em lote em 08/06. Baixadas com token da conta e comparadas token a token: nenhuma tem comportamento diferente do repo.
- [x] Publicar a `reprocessar-autores` do repo. Publicada em 24/11/2026; o job diário voltou a ter como funcionar.
- [x] `enviar-lembretes-meta` trazida para o repo.
- [ ] Remover do remoto `buscar-livros` e `clever-api`, protótipos sem nenhum chamador.
- [ ] Regenerar `types.ts`.

**Processo** (itens marcados já foram entregues junto com este roadmap)
- [x] CI no GitHub Actions: lint, tipos, testes e build em todo PR.
- [x] Modelo de pull request com checklist do projeto.
- [x] `CHANGELOG.md` e política de versão (seção 10).
- [ ] Proteger a branch `main`: merge só com CI verde. Configuração do GitHub, a cargo de Paulo.
- [x] Renomear o pacote para `namzu`, manter um único lockfile (`package-lock.json`), remover `lovable-tagger`.
- [ ] Monitoramento de erros em produção (Sentry ou equivalente).
- [ ] Confirmar política de backup do banco no plano atual do Supabase.

**Critério de saída:** advisor de segurança sem função de escrita exposta a `anon`; lista de migrações do repo idêntica à do remoto; `main` protegida com CI obrigatório; tag `v0.2.0`.

**Situação em 24/11/2026:** os dois primeiros critérios estão cumpridos e a versão `0.2.0` está registrada no `package.json` e no `CHANGELOG.md`. Faltam a proteção da `main` e a tag, além dos itens abertos acima.

---

## 4. Fase 1 — Descoberta (em paralelo com a Fase 0)

**Objetivo:** confirmar com organizadores reais a dor, o perfil prioritário e a disposição a pagar, antes de construir o painel.

- [ ] Listar 20 organizadores (Instagram, grupos de WhatsApp e Telegram, clubes que cobram via Hotmart, leitores do blog).
- [ ] Fazer 10 entrevistas de 30 minutos: 6 com mediadores ou criadores, 4 com clubes de amigos ou de empresa. Roteiro em `docs/descoberta/roteiro-entrevista-organizadores.md`.
- [ ] Mostrar protótipo navegável do painel (telas da Fase 3) na segunda metade da conversa.
- [ ] Registrar cada entrevista em `docs/descoberta/` e fechar com uma síntese de uma página.

**Critério de saída:** pelo menos 6 de 10 descrevem a dor sem serem induzidos; pelo menos 3 aceitam pilotar com o clube deles; faixa de preço aceitável identificada.

**Critério de parada:** menos de 3 interessados em pilotar. Nesse caso, rever o perfil-alvo (por exemplo, ir direto ao institucional) antes de iniciar a Fase 3.

---

## 5. Fase 2 — Foco (versão 0.3.0)

**Objetivo:** quem abre o NAMZU entende em 10 segundos que é uma ferramenta de clube.

- [x] Nova entrada: visitante vê a proposta para organizadores e o botão "Criar meu clube". Quem chega por link de convite cai direto no clube, com cadastro curto (flag `show_entrada_organizador`, página `/convite/:id`, função `clube_convite`).
- [x] Desligar por feature flag, sem apagar código: `/leitores` e matching, onboarding por quiz (`show_onboarding`), Código ME (`show_codigo_me`), gamificação individual na home (`show_gamificacao_home`), metas e histórico como itens de menu. Feito no código: `/leitores` nasce desligada e a entrada do organizador tira o quiz e o Código ME do caminho. Em produção desde 25/11/2026, com o preset "Foco no organizador" aplicado a pedido do Paulo: menu de três destinos e entrada do organizador ligados; Leitores, Metas, Histórico e gamificação da home desligados. O preset "Padrão completo" do painel admin desfaz tudo.
- [x] Criar as flags que faltam: `/leitores`, `/citacoes`, `/busca` e `/livros` agora têm `FeatureRoute` (`show_leitores` nasce desligada).
- [x] Navegação do membro reduzida a três destinos: Meu clube, Minha leitura, Perfil (flag `show_navegacao_foco`; o menu "Mais" virou a seção Conta do Perfil).
- [x] Segurança de clubes: regras de entrada em `clube_membros`, clubes privados visíveis só para quem faz parte e moderador aprovando pedidos (`docs/runbooks/fase2-seguranca-clubes.md`). Não estava no plano original; surgiu da revisão das políticas durante a entrega do convite.
- [x] Carregamento por rota (`React.lazy`), admin em chunk separado. JavaScript inicial: de 749 kB para 199 kB gzip.
- [x] Remover código morto: páginas sem rota, `src/features/`. Ficaram de fora, para decisão do Paulo, componentes prontos mas não ligados a nenhuma tela: `RegistrarLeituraDialog`, `PosLeituraBlock`, `LeituraExperienciaCard`, `LeiturasList`, `PercentualProgressoControl`, `SessoesList`, `LeituraCopilotoButton`, `PendenciasAvaliacaoCard`, `NamzuBackground`, `StatsChips`, `admin/FilterBar` e os hooks `useResenhas` e `useAvaliacoesPendentes`.
- [x] Instrumentar eventos de produto: `clube_criado`, `convite_gerado`, `membro_entrou`, `progresso_registrado`, `encontro_criado`, `rsvp_respondido`, `roteiro_ia_gerado`, gravados na tabela `eventos_produto` (`docs/metricas-produto.md`). Na verdade nada era medido antes: o funil de onboarding chamava o Google Analytics, que nunca foi instalado.
- [x] Reescrever o `README.md` e a home do blog para o organizador.

**Critério de saída:** novo usuário cria um clube e convida o primeiro membro em menos de 3 minutos, sem passar por telas que não sejam de clube; bundle inicial abaixo de 300 kB gzip.

**Situação em 25/11/2026:** todos os itens estão entregues e a versão `0.3.0` está registrada no `package.json` e no `CHANGELOG.md`. O carregamento inicial ficou em 199 kB gzip. O caminho de criar o clube e convidar não passa por telas que não sejam de clube: página pública, cadastro, formulário do clube e link de convite. O tempo de menos de 3 minutos ainda não foi medido com um organizador de verdade; fica para as entrevistas da Fase 1 e para o piloto. Falta a tag `v0.3.0`.

---

## 6. Fase 3 — Painel do organizador (versão 0.4.0)

**Objetivo:** substituir a planilha e as cobranças manuais no WhatsApp.

O que já existe e será reaproveitado: aba "Área do curador" com estatísticas e top contribuidores, papéis membro/moderador com expulsão, eventos com RSVP, trilhas, canais, microgrupos, conteúdos, botões de IA (perguntas profundas, resumo de discussão), gamificação de clube atrás da flag `show_gamificacao_clube`.

| Módulo | Entrega | Situação hoje |
|---|---|---|
| Visão geral | Página própria do organizador com: próximo encontro, quem confirmou, em que ponto do livro cada membro está, quem está parado há 7 dias | Parcial (estatísticas em `GestaoTab`) |
| Membros | Convite por link e QR code, aprovação de entrada, co-curador, última atividade, exportar CSV | Parcial (papéis e expulsão existem; link só em clube privado) |
| Livro e cronograma | Livro do ciclo, metas por semana ou capítulo, aviso automático de meta | Parcial (trilhas) |
| Encontros | Votação de data, lembrete automático 24 h e 1 h antes, lista de presença, ata | Parcial (evento e RSVP) |
| Escolha do próximo livro | Indicações dos membros, votação, sorteio | Não existe |
| Mediação com IA | Roteiro de discussão por encontro, resumo pós-encontro, perguntas por trecho do cronograma | Parcial (botões isolados) |
| Comunicação | Aviso do organizador para todos, por notificação e e-mail | Não existe |

**App do membro:** entrar pelo link, ver livro e meta da semana, registrar progresso em um toque, confirmar presença, participar da discussão. Nada além disso na primeira tela.

**Dependência a resolver antes desta fase:** `clube-ai` e `leitura-copiloto` chamam o gateway de IA do Lovable (`ai.gateway.lovable.dev`, com a variável `LOVABLE_API_KEY`) para usar modelos Gemini. A mediação com IA é o diferencial do produto e hoje depende de uma conta de outra plataforma. Decidir o provedor próprio e migrar antes de construir sobre isso.

**Decisões do Paulo em 25/11/2026**

- **Ordem das entregas:** (1) visão geral, (2) membros, (3) livro e cronograma, (4) encontros, (5) avisos, (6) co-curador, (7) próximo livro, (8) mediação com IA.
- **Lembretes e avisos:** começar com aviso dentro do app e um botão "copiar mensagem para o grupo", com o texto pronto para o WhatsApp. E-mail e notificação no celular não estão configurados em produção e ficam para depois.
- **Provedor de IA:** API do Google direto, com os mesmos modelos Gemini usados hoje pelo gateway do Lovable. A troca acontece antes da entrega 8.
- **Entrevistas:** as entregas 1 a 6 seguem agora. As entregas 7 e 8 esperam as entrevistas da Fase 1.

**Andamento**

- [x] Entrega 1 — Visão geral do organizador (aba "Visão geral", função `clube_visao_geral`).
- [x] Entrega 2 — Membros: QR code do convite, última atividade na aba Membros e exportação da lista em CSV.

**Regras de engenharia para a fase**
- Toda mudança de schema em migração versionada, aplicada no remoto com a mesma versão.
- Todo formulário de criação com rascunho em `localStorage`, conforme `CLAUDE.md`.
- Testes para as RPCs e hooks novos do painel. Meta: nenhum módulo novo sem teste.
- Políticas RLS novas já no padrão `(select auth.uid())`.

**Critério de saída:** um organizador consegue, sem ajuda, criar o clube, convidar por link, definir livro e cronograma, marcar encontro, abrir votação e gerar o roteiro de discussão.

---

## 7. Fase 4 — Piloto (8 semanas)

**Objetivo:** provar uso real por clubes de terceiros.

- [ ] 3 a 5 clubes vindos da Fase 1, gratuitos, com acompanhamento semanal por WhatsApp com o organizador.
- [ ] Correções semanais (versões 0.4.x). Nada de funcionalidade nova fora do que o piloto pedir.
- [ ] Entrevista de saída com cada organizador e 2 membros por clube.

| Métrica | Meta |
|---|---|
| Membros que entram no app até 7 dias após o convite | 60% ou mais |
| Membros que registram progresso em cada semana | 40% ou mais |
| RSVP respondido por encontro | 70% ou mais |
| Organizadores ainda usando o painel na semana 8 | 3 de 5 |
| Organizadores que dizem que pagariam | 2 de 5, com valor declarado |

**Critério de saída:** metas de retenção do organizador e de disposição a pagar atingidas.

**Critério de parada:** organizadores voltam para a planilha antes da semana 4. Rever proposta de valor antes de construir cobrança.

---

## 8. Fase 5 — Monetização (versão 1.0.0)

**Objetivo:** primeira receita.

- [ ] Plano gratuito com limite (referência de mercado: 1 clube, até 30 membros) e plano Organizador pago. Preço definido com os dados do piloto; a referência do concorrente é R$ 19,90/mês.
- [ ] Testar duas receitas além da assinatura, porque a assinatura sozinha rende pouco (ver `docs/tamanho-mercado-2026-11.md`): taxa sobre a mensalidade dos clubes pagos e plano institucional para escolas e bibliotecas.
- [ ] Clube pago: organizador cobra mensalidade dos membros com PIX e cartão recorrentes, recebendo direto. Escolher provedor de pagamento na fase; avaliar taxa, PIX recorrente e repasse.
- [ ] Decidir o destino das tabelas `pagamentos`, `creator_assinaturas` e `creator_assinantes`: adotar com RLS ou substituir.
- [ ] Termos de uso e política de privacidade revistos para o novo modelo (LGPD: o organizador passa a tratar dados dos membros).
- [ ] Formalização para emitir cobrança (CNPJ ou MEI, nota fiscal).
- [ ] Página pública de preços.

**Critério de saída:** 3 organizadores pagantes; primeiro clube pago recebendo mensalidade pelo NAMZU.

---

## 9. Fase 6 — Crescimento (versões 1.x)

Ordem a definir pelos dados do piloto. Candidatas:

- **Ponte com o WhatsApp:** lembrete do encontro e resumo semanal postados no grupo do clube. O clube vive no WhatsApp; entrar como complemento reduz a barreira de adoção.
- **PWA com notificação push** (hoje o service worker é só um kill-switch).
- **Diretório público de clubes** indexável, como canal de aquisição orgânica.
- **Página pública do clube** com marca do organizador.
- **Link de afiliado** do organizador na biblioteca do clube.
- **Segmento institucional:** escolas, bibliotecas e empresas, com relatório de leitura por turma ou equipe.
- **Reativar** matching e gamificação individual, se os dados mostrarem demanda dentro dos clubes.

---

## 10. Padrões de profissionalização

**Versionamento**
- Versão semântica. `0.x` enquanto não houver cliente pagante; `1.0.0` na abertura com cobrança.
- Cada fase fecha com uma tag `vX.Y.0` e uma entrada no `CHANGELOG.md`.
- Correções entre fases: `vX.Y.Z`.

**Fluxo de trabalho**
- Uma branch por entrega, PR com o modelo do repositório, CI verde obrigatório, merge em `main` publica na Vercel.
- Backlog em GitHub Issues com um marco (milestone) por fase.
- Mensagens de commit e PRs em português, conforme `CLAUDE.md`.

**Qualidade**
- CI roda `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
- Código novo sem `as any` em queries: se o tipo não existe, regenerar `types.ts`.
- Chaves de query novas na fábrica `src/constants/queryKeys.ts`.

**Banco**
- Nenhuma alteração pelo dashboard. Sempre migração versionada.
- Rodar os advisors de segurança e performance do Supabase após cada migração.

**Ritual semanal (30 minutos)**
- Olhar a métrica norte e as métricas da fase.
- Fechar o que foi entregue, escolher as 3 entregas da semana seguinte.
- Atualizar este roadmap se alguma hipótese mudou.

---

## 11. O que não fazer agora

- Funcionalidade nova para o leitor individual.
- Aplicativo nativo. O PWA cobre o piloto.
- Clube pago antes do piloto provar retenção.
- Apagar tabelas ou código do lado individual antes do fim do piloto. Desligar por flag é reversível; apagar não é.

## 12. Decisões em aberto para Paulo

1. Aprovar o reposicionamento e este roadmap.
2. Perfil prioritário para as entrevistas: a recomendação é mediadores e criadores com clube de 20+ membros.
3. Dedicação semanal disponível, para calibrar as estimativas.
4. Quem conduz as entrevistas da Fase 1. Essa etapa não pode ser delegada ao código.
