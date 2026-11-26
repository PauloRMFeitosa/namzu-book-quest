# IA do NAMZU

As funções de IA (`clube-ai` e `leitura-copiloto`) chamam modelos Gemini pela **API do Google**, pelo endereço compatível com a OpenAI. O código comum fica em `supabase/functions/_shared/ia.ts`.

## Segredos das Edge Functions

Ficam no Supabase, em Edge Functions > Secrets. Nunca no repositório nem no app.

| Segredo | Para que serve | Obrigatório |
|---|---|---|
| `GEMINI_API_KEY` | Chave da API do Google. Com ela, as funções usam o Google. | Sim, para usar o Google |
| `GEMINI_MODELO_RAPIDO` | Modelo das tarefas comuns. Padrão: `gemini-2.5-flash` | Não |
| `GEMINI_MODELO_AVANCADO` | Modelo das tarefas que pedem mais raciocínio. Padrão: `gemini-2.5-pro` | Não |
| `LOVABLE_API_KEY` | Chave do gateway antigo. Só é usada enquanto `GEMINI_API_KEY` não existir. | Não |

## Como ligar o Google

1. Criar a chave em https://aistudio.google.com/apikey.
2. No Supabase, em Edge Functions > Secrets, criar `GEMINI_API_KEY` com a chave.
3. Testar um botão de IA no app, por exemplo "Perguntas para discussão" em um clube.
4. Com tudo funcionando, apagar o segredo `LOVABLE_API_KEY`.

A troca vale na chamada seguinte; não precisa publicar as funções de novo.

## Trocar de modelo

Os modelos mudam de nome com o tempo. Para trocar, crie ou altere `GEMINI_MODELO_RAPIDO` e `GEMINI_MODELO_AVANCADO` com os nomes da lista atual do Google. Não precisa mexer no código.

## O que a pessoa vê quando falha

| Situação | Mensagem |
|---|---|
| Limite de uso atingido | "Limite de uso da IA atingido. Tente novamente em alguns instantes." |
| Chave recusada ou ausente | "A chave da IA foi recusada. Avise o suporte." ou "A IA não está configurada. Avise o suporte." |
| Outra falha do provedor | "A IA não respondeu agora (...). Tente de novo em instantes." |

O detalhe técnico da falha fica no log da função, no Supabase, e não é mostrado para a pessoa.

## Testes

A lógica do módulo é testada pelo Vitest em `src/lib/iaCompartilhada.test.ts`, com o provedor simulado.
