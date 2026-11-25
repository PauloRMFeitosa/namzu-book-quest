# NAMZU

Plataforma para quem organiza clube de leitura.

O organizador cria o clube, convida os membros por um link e acompanha a leitura de todos em um só lugar. Cada membro tem o seu espaço para registrar progresso, guardar citações e participar das discussões.

Em produção: [namzu.com.br](https://www.namzu.com.br). Blog: [blog.namzu.com.br](https://blog.namzu.com.br).

## Para quem é

- **Organizadores de clubes de leitura**, que hoje tocam o clube por grupo de WhatsApp, planilha e lembretes manuais.
- **Membros desses clubes**, que entram pelo convite e usam o app para ler junto com o grupo.

## O que o organizador faz

- Cria o clube, público ou privado, em poucos minutos.
- Convida por link. Quem recebe faz um cadastro curto e cai dentro do clube.
- Monta a trilha de leituras e vê o progresso de cada membro.
- Marca encontros e acompanha quem confirmou presença.
- Organiza a conversa em feed e canais, junto do livro.
- Aprova pedidos de entrada e define moderadores.

## O que o membro faz

- Acompanha a leitura do clube e registra o próprio progresso.
- Mantém a estante, as leituras em andamento e as citações.
- Participa das discussões e responde aos encontros.

## Direção do produto

O NAMZU começou como rede social de leitura e está sendo reposicionado como plataforma do organizador de clube. O plano por fases, com critérios de saída, está em [`docs/roadmap.md`](docs/roadmap.md).

| Documento | Conteúdo |
|---|---|
| [`docs/roadmap.md`](docs/roadmap.md) | Decisão estratégica, fases e métricas |
| [`docs/benchmark-concorrentes-2026-11.md`](docs/benchmark-concorrentes-2026-11.md) | Produtos parecidos e lacunas |
| [`docs/tamanho-mercado-2026-11.md`](docs/tamanho-mercado-2026-11.md) | Tamanho do mercado no Brasil e no Nordeste |
| [`docs/metricas-produto.md`](docs/metricas-produto.md) | Eventos medidos e consultas de acompanhamento |
| [`docs/runbooks/`](docs/runbooks) | Registro das mudanças aplicadas em produção |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de versões |

## Desenvolvimento

Requisitos: Node 22 e npm.

```bash
npm ci
cp .env.example .env   # preencher VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev            # http://localhost:8080
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos |
| `npm run test` | Testes (Vitest) |

O CI roda lint, tipos, testes e build em todo pull request.

## Arquitetura

- **App:** React, TypeScript e Vite, com Tailwind e shadcn/ui. Cada página é carregada sob demanda.
- **Dados e autenticação:** Supabase (PostgreSQL com RLS e Edge Functions em Deno).
- **Hospedagem:** Vercel. O blog, em `apps/blog`, é um site Astro separado.

| Pasta | Conteúdo |
|---|---|
| `src/pages/` | Uma página por rota |
| `src/components/` | Componentes por domínio (`clubes`, `leituras`, `perfil`...) |
| `src/hooks/` | Consultas e ações |
| `src/lib/` | Lógica pura, com testes |
| `supabase/migrations/` | Histórico do banco, igual ao aplicado em produção |
| `supabase/functions/` | Edge Functions |
| `apps/blog/` | Blog |

As convenções do projeto estão em [`CLAUDE.md`](CLAUDE.md): idioma, feature flags, persistência de rascunho em formulários e regras de migração.

## Como contribuir

1. Abra um pull request para a `main` usando o modelo do repositório.
2. Registre a mudança no `CHANGELOG.md`.
3. Mudança de banco entra como migração versionada em `supabase/migrations/` e é aplicada em produção com a mesma versão.

## Licença

Projeto protegido por direitos autorais. Todos os direitos reservados.
