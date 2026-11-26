# Backup do banco

Situação conferida em 26/11/2026.

## O que existe hoje

O projeto do Supabase está no **plano gratuito**, e o plano gratuito **não faz backup automático**. Os backups diários só existem a partir do plano Pro. Se o banco for corrompido ou apagado, não há cópia para restaurar.

O que já protege parte do risco:

- O schema inteiro (tabelas, funções, políticas) está em `supabase/migrations/`, idêntico ao remoto. Dá para recriar a estrutura do zero.
- O código do app e das Edge Functions está no repositório.

O que **não** tem cópia: os dados. Usuários, clubes, leituras, citações, encontros, avisos.

## Opções

| Opção | Custo | O que resolve |
|---|---|---|
| Subir para o plano Pro do Supabase | Pago, por mês | Backup diário automático com 7 dias de retenção, e o projeto deixa de pausar por inatividade |
| Cópia manual periódica com `pg_dump` | Gratuito | Uma cópia dos dados no dia em que for feita. Depende de alguém lembrar |
| Cópia automática por GitHub Actions | Gratuito | Cópia semanal sem depender de memória. Exige guardar a senha do banco como segredo no GitHub e decidir onde guardar o arquivo, que contém dados pessoais |

## Recomendação

Antes do piloto (Fase 4), ter backup automático: ou o plano Pro, ou a cópia semanal por GitHub Actions. Até lá, fazer uma cópia manual antes de qualquer migração que altere ou apague dados.

## Cópia manual

A senha do banco fica em Supabase > Project Settings > Database. Com o `pg_dump` instalado:

```bash
pg_dump "postgresql://postgres:SENHA@db.qiiuvlmauztjitflqcfd.supabase.co:5432/postgres" --no-owner --format=custom --file=namzu-AAAA-MM-DD.dump
```

O arquivo contém dados pessoais dos usuários. Guarde em local privado e não envie ao repositório.

## Baseline do schema

O baseline (`supabase db pull`) também pede a senha do banco e a CLI do Supabase, por isso ainda não foi gerado. Ele não substitui as migrações; serve para recriar o banco em um passo só.
