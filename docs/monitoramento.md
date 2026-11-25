# Monitoramento de erros

O NAMZU registra os erros que o app encontra no navegador de quem está logado. Os registros ficam na tabela `erros_app` do Supabase e aparecem em **Admin > Erros do app**. Não há serviço externo: nada sai do banco do projeto.

## O que é registrado

| Origem | Quando acontece |
|---|---|
| `erro` | Erro de JavaScript que ninguém tratou |
| `promessa` | Promessa rejeitada que ninguém tratou |
| `react` | Uma tela quebrou e caiu na tela "Algo deu errado" |
| `consulta` | Uma consulta ao banco falhou depois das tentativas |

Cada registro guarda: mensagem técnica, pilha de execução, tela (rota sem ids nem parâmetros), versão do app, ambiente (`producao` ou `preview`), navegador e a pessoa logada.

## O que não é registrado

- Erros de quem não está logado.
- Texto digitado pela pessoa, e parâmetros da URL.
- Ruído: falta de rede, pedido cancelado, sessão vencida, versão trocada durante a navegação, extensões do navegador. A lista está em `src/lib/monitoramento.ts` (`ehRuido`).
- Erros de mutação já tratados na tela com aviso (toast), como "nome obrigatório".

## Limites

- Cada erro diferente é enviado uma vez por sessão do navegador, até 20 por sessão.
- O banco aceita até 30 registros por pessoa por hora; o resto é descartado.
- Os registros são apagados depois de 30 dias (agendamento `limpar-erros-app`, todo dia às 4h de Brasília).

## Como acompanhar

Em **Admin > Erros do app**, os registros iguais aparecem juntos, com quantas vezes aconteceram, quantas pessoas viram e a última vez. Abrir um grupo mostra as telas, as versões, o navegador e a pilha.

Depois de publicar uma versão, vale olhar o período "Hoje e ontem" em Produção.

Consulta direta, para os erros mais frequentes dos últimos 7 dias:

```sql
select assinatura, origem, min(mensagem) as mensagem,
       count(*) as vezes, count(distinct user_id) as pessoas, max(criado_em) as ultima
from erros_app
where ambiente = 'producao' and criado_em > now() - interval '7 days'
group by assinatura, origem
order by vezes desc;
```

## Como registrar um erro no código

O registro é automático. Para um erro tratado que ainda assim merece atenção:

```typescript
import { registrarErro } from "@/services/monitoramento";

registrarErro("erro", erro);
```

`registrarErro` nunca lança e não grava em desenvolvimento, só escreve no console.
