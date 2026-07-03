# Migrações do banco (Supabase)

## Estado atual

Os arquivos versionados (`<timestamp>_<nome>.sql`) são o **histórico real de
migrações aplicadas ao projeto remoto** (`qiiuvlmauztjitflqcfd`), exportado de
`supabase_migrations.schema_migrations` em 2026-07-03. A partir de agora, toda
mudança de schema deve gerar um arquivo aqui **e** ser aplicada no remoto com a
mesma versão (via `supabase db push`, MCP `apply_migration` ou dashboard), para
que repo e banco não voltem a divergir.

## Limitação conhecida: baseline

O histórico versionado começa em `20260609...`. Tabelas criadas antes disso
(`obras`, `clubes`, `leituras`, `perfis`, etc.) **não estão cobertas** por
nenhuma migração deste diretório — foram criadas direto no dashboard nas fases
iniciais do projeto. Para reconstruir o banco do zero, gere primeiro um
baseline com:

```bash
supabase db pull   # requer login no CLI e senha do banco
```

## Pasta `legado/`

Contém os arquivos SQL antigos sem versionamento que existiam neste diretório
antes da exportação do histórico. Foram mantidos apenas como referência
(o conteúdo deles já está aplicado no banco); o Supabase CLI os ignora.

## Regenerar tipos após mudanças de schema

```bash
supabase gen types typescript --project-id qiiuvlmauztjitflqcfd > src/integrations/supabase/types.ts
```
