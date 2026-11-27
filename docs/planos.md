# Planos do organizador

Cadastro dos planos que o organizador de clube pode ter: preço, limites e recursos. Fica em **Admin > Planos**. É a preparação da Fase 5 do `docs/roadmap.md` (monetização).

## Situação atual

- **Valem no app** os três limites de quantidade: clubes por organizador, membros por clube e co-curadores por clube. O banco recusa o que passa do limite.
- **Ainda não valem** os recursos de cada plano nem o limite de usos de IA: todo clube usa tudo.
- **Não há cobrança.** O plano de cada organizador é definido à mão pelo admin.
- Enquanto a cobrança não é ativada, o plano padrão é o **Lançamento**: grátis, com todos os recursos e sem limites. Assim ninguém é bloqueado. Para limitar alguém (por exemplo, para testar), atribua outro plano à pessoa em Admin > Planos.

As próximas etapas, nesta ordem: aplicar os recursos e o limite de IA, página pública de preços, cobrança e endereço próprio da página do clube.

## Como os limites funcionam

- **De quem é o plano:** de quem criou o clube. Vale para todos os clubes dessa pessoa.
- **Qual plano vale:** o atribuído em Admin > Planos, se não estiver vencido; senão, o plano padrão. Sem plano padrão e sem atribuição, não há limite.
- **Limite vazio** é sem limite.
- **Só barra o que é novo.** Quem já está acima do limite continua como está, mas não cresce: não cria outro clube, não recebe novo membro, não nomeia outro co-curador.
- **Clubes:** contam os clubes ativos que a pessoa criou. A criação de clube avisa antes e o banco recusa.
- **Membros:** contam os membros ativos. Pedido de entrada pendente não conta; o limite barra a aprovação. Quem tenta entrar em clube lotado vê que as vagas estão ocupadas.
- **Co-curadores:** além do limite do plano, cada clube aceita no máximo 3.
- **Onde o organizador vê:** Painel > Configurações mostra o plano e o uso de cada limite. Painel > Membros avisa quando o clube está a partir de 80% do limite ou lotado.

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

Os recursos com `emBreve` ainda não existem no app (página personalizada, endereço próprio, cobrança de mensalidade). Podem ser marcados no plano desde já.

## Organizadores

A lista mostra quem organiza pelo menos um clube, quantos clubes tem, o tamanho do maior e o plano. Quem não tem plano atribuído usa o plano padrão. O aviso "Acima do plano" aparece quando o uso passa de algum limite: essa pessoa continua como está, mas não cresce.

Arquivar um plano tira ele da oferta, mas quem já estava nele continua. O plano padrão não pode ser arquivado.

## Banco

- `planos`: os planos. Qualquer pessoa logada lê; só admin grava.
- `organizador_planos`: o plano de cada organizador, com origem (`manual`, `cortesia`, `piloto`, `pagamento`), validade e observação. Cada pessoa lê a própria linha; só admin grava.
- `admin_planos_organizadores()`: organizadores com o uso de cada um, só para admin.

- `plano_do_organizador(user_id)`: o plano que vale para a pessoa. Uso interno.
- `clube_plano(clube_id)`: plano e uso de um clube, para quem gere o clube.
- `meu_plano()`: plano de quem está logado e quantos clubes organiza.
- Gatilhos `trg_clubes_limite_do_plano` e `trg_clube_membros_zz_limite_do_plano`: recusam o que passa do limite. O "zz" no nome faz o segundo rodar depois do gatilho de regras de entrada.

Migrações: `*_planos.sql` (cadastro) e `*_planos_limites.sql` (limites e plano Lançamento). A primeira cria três planos de partida como rascunho (Básico, Organizador e Profissional), com preços e limites que são hipóteses.

## Código

- Lógica e catálogo: `src/lib/planos.ts` (com testes).
- Consultas: `src/hooks/admin/usePlanos.ts`.
- Tela: `src/pages/admin/tabs/PlanosTab.tsx`.
- Uso dos limites no app: `src/lib/planoDoClube.ts`, `src/hooks/clubes/usePlanoDoClube.ts` e `src/components/clubes/painel-organizador/PlanoDoPainel.tsx`.
- Criar e editar: `src/pages/admin/EditarPlano.tsx`, em `/admin/planos/novo` e `/admin/planos/:id`.
