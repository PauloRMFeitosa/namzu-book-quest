# Métricas de produto

Como o NAMZU mede o próprio uso a partir da Fase 2 do `docs/roadmap.md`.

## 1. De onde vêm os números

Há duas fontes. Para cada pergunta, use a que é mais confiável.

| Fonte | O que é | Quando usar |
|---|---|---|
| Tabelas do domínio | `clubes`, `clube_membros`, `leitura_progresso`, `eventos`, `evento_participantes`, `clube_posts`, `citacoes` | Contagens e a métrica norte. São o registro oficial e têm histórico desde o início |
| `eventos_produto` | Eventos gravados pelo app a partir de 25/11/2026 | O que as tabelas não guardam (convite gerado, uso da IA) e o caminho que a pessoa fez (origem, canal) |

Antes da Fase 2 nada era medido. O funil de onboarding chamava o Google Analytics, que nunca foi instalado.

## 2. Eventos

Gravados por `registrarEvento` em `src/services/analytics.ts`. Só usuário logado grava, sempre em nome próprio. Só admin lê.

| Evento | Quando dispara | Propriedades |
|---|---|---|
| `clube_criado` | Clube criado com sucesso | `visibilidade` |
| `convite_gerado` | Link de convite copiado, enviado pelo WhatsApp ou compartilhado | `canal`: `copiar`, `whatsapp`, `compartilhar` |
| `membro_entrou` | Pessoa entrou ou pediu para entrar em um clube | `status`: `ativo` ou `pendente` |
| `progresso_registrado` | Progresso de leitura salvo | `origem`: `sessao`, `modal`, `clube`, `concluir`, `registro`, `finalizar`. `percentual`. `tempo_minutos` na sessão |
| `encontro_criado` | Evento do clube criado | `tipo` |
| `rsvp_respondido` | Resposta a um evento | `status`: `confirmado`, `talvez`, `recusado`, `removido` |
| `roteiro_ia_gerado` | Resposta de IA gerada com sucesso | `acao`: `resumo_discussao`, `perguntas_profundas`, `matchmaking`, `recomendacoes`, `copiloto_*` |

Regras para evento novo:

- Nome em minúsculas com sublinhado, no passado: `coisa_aconteceu`.
- Acrescente o nome ao tipo `EventoProduto`.
- Propriedades curtas e sem texto digitado pelo usuário. O serviço corta textos em 120 caracteres e aceita no máximo 12 chaves.
- O evento dispara depois que a ação deu certo, nunca antes.

O que ainda não é medido: quem abre a página pública ou o convite sem estar logado. A tabela não aceita escrita de visitante.

## 3. Métrica norte: clubes ativos por semana

Definição do roadmap: um clube é ativo quando pelo menos 3 membros registraram atividade (progresso, post, RSVP ou citação) nos últimos 7 dias.

A consulta abaixo conta progresso, posts e RSVP, que têm ligação direta com o clube. Rodar no painel SQL do Supabase.

```sql
with atividade as (
  select ul.clube_id, lp.user_id
  from leitura_progresso lp
  join leituras l on l.id = lp.leitura_id
  join usuario_leituras ul on ul.id = l.usuario_leitura_id
  where ul.clube_id is not null and lp.data_registro > now() - interval '7 days'
  union
  select clube_id, user_id from clube_posts where created_at > now() - interval '7 days'
  union
  select e.clube_id, ep.user_id
  from evento_participantes ep join eventos e on e.id = ep.evento_id
  where e.clube_id is not null and ep.joined_at > now() - interval '7 days'
)
select c.nome, count(distinct a.user_id) as membros_com_atividade
from atividade a join clubes c on c.id = a.clube_id
group by c.nome
having count(distinct a.user_id) >= 3
order by 2 desc;
```

**Ponto de partida, em 25/11/2026: zero clubes ativos.** Nenhum clube teve progresso, post ou RSVP de membro nos sete dias anteriores. É o número a bater no piloto da Fase 4.

## 4. Consultas de acompanhamento

Eventos por semana:

```sql
select date_trunc('week', criado_em)::date as semana, evento, count(*) as vezes, count(distinct user_id) as pessoas
from eventos_produto
group by 1, 2
order by 1 desc, 2;
```

Do clube criado ao primeiro convite:

```sql
select
  count(*) filter (where convidou) as clubes_que_convidaram,
  count(*) as clubes_criados
from (
  select c.clube_id,
         exists (select 1 from eventos_produto g
                 where g.evento = 'convite_gerado' and g.clube_id = c.clube_id) as convidou
  from eventos_produto c
  where c.evento = 'clube_criado'
) t;
```

Canal de convite mais usado:

```sql
select props->>'canal' as canal, count(*) from eventos_produto
where evento = 'convite_gerado' group by 1 order by 2 desc;
```
