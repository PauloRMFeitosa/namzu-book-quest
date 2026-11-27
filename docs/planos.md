# Planos do organizador

Cadastro dos planos que o organizador de clube pode ter: preço, limites e recursos. Fica em **Admin > Planos**. É a preparação da Fase 5 do `docs/roadmap.md` (monetização).

## Situação atual

- Os planos **não bloqueiam nada no app**. Criar clube, aceitar membro e usar recurso continuam livres para todos.
- **Não há cobrança.** O plano de cada organizador é definido à mão pelo admin.
- O que existe serve para montar a oferta e ver, com os dados reais, quem caberia em cada plano.

As próximas etapas, nesta ordem: aplicar os limites no app, página pública de preços, cobrança e endereço próprio da página do clube.

## O que um plano tem

| Campo | O que é |
|---|---|
| Nome e descrição | Como aparece para o organizador. |
| Identificador | Nome interno (`basico`, `organizador`). Evite trocar depois de o plano estar em uso. |
| Preço mensal e anual | Em reais. Mensal vazio é plano grátis; anual vazio é não oferecer plano anual. |
| Dias de teste | De 0 a 90. |
| Membros por clube | Limite de membros ativos em cada clube. |
| Clubes por organizador | Quantos clubes a pessoa pode organizar. |
| Co-curadores por clube | Zero para não permitir. |
| Usos de IA por mês | Zero para não permitir. |
| Recursos | O que o plano inclui, marcado a partir do catálogo. |
| Publicado | Aparece na página de preços. Desligado, é rascunho ou plano interno (cortesia, piloto). |
| Destaque | Marca o plano como o recomendado. |
| Plano padrão | Vale para quem não tem plano atribuído. Só existe um; marcar outro tira a marca do anterior. |
| Ordem | Posição na lista. |

Limite vazio quer dizer sem limite.

## Recursos

O catálogo de recursos fica no código, em `RECURSOS` de `src/lib/planos.ts`, agrupado em Clube, Comunidade, Gestão, Inteligência artificial, Página e marca e Receita. Para oferecer um recurso novo nos planos, acrescente uma linha ali; não precisa de migração.

Os recursos com `emBreve` ainda não existem no app (página pública, endereço próprio, cobrança de mensalidade). Podem ser marcados no plano desde já.

## Organizadores

A lista mostra quem organiza pelo menos um clube, quantos clubes tem, o tamanho do maior e o plano. Quem não tem plano atribuído usa o plano padrão. O aviso "Acima do plano" aparece quando o uso passa de algum limite; hoje é só informação.

Arquivar um plano tira ele da oferta, mas quem já estava nele continua. O plano padrão não pode ser arquivado.

## Banco

- `planos`: os planos. Qualquer pessoa logada lê; só admin grava.
- `organizador_planos`: o plano de cada organizador, com origem (`manual`, `cortesia`, `piloto`, `pagamento`), validade e observação. Cada pessoa lê a própria linha; só admin grava.
- `admin_planos_organizadores()`: organizadores com o uso de cada um, só para admin.

Migração: `supabase/migrations/*_planos.sql`. Ela cria três planos de partida como rascunho (Básico, Organizador e Profissional), com preços e limites que são hipóteses.

## Código

- Lógica e catálogo: `src/lib/planos.ts` (com testes).
- Consultas: `src/hooks/admin/usePlanos.ts`.
- Tela: `src/pages/admin/tabs/PlanosTab.tsx`.
- Criar e editar: `src/pages/admin/EditarPlano.tsx`, em `/admin/planos/novo` e `/admin/planos/:id`.
