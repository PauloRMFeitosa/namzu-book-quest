## Objetivo
Criar uma página de detalhe da **obra** (livro do acervo), acessada ao clicar em qualquer capa de livro no app. Mostra dados completos do livro, autor, editora, outras obras do mesmo autor, citações, resenhas, avaliação por estrelas e estatísticas de leitura.

## Nova rota
- `/obras/:id` → `<ObraDetalhe />` (id = `obras.id`)
- Adicionar em `src/App.tsx` dentro de `<ProtectedRoute>`.

## Novo arquivo: `src/pages/ObraDetalhe.tsx`

### Layout (mobile-first, 375px)
```
[← Voltar]
[Capa grande]   Título
                Autor (link → filtra acervo)
                Ano · Editora
                ★★★★☆ 4.2 (32 avaliações)

[Sinopse]

[Estatísticas]  📖 Leram: 120   📚 Querem ler: 45   📗 Lendo: 18

[Minha biblioteca]
  - Se já está em usuario_livros: badge do status + botão "Abrir minha leitura" (→ /leituras/{usuario_livro_id})
  - Se NÃO está: botões "Quero ler" / "Já li"

[Outras obras do autor]  (carrossel horizontal de capas — clicáveis)

[Citações da comunidade]  (lista com texto + página, autor da citação anônimo/nome)

[Resenhas]  (lista com estrelas + texto + nome do usuário, mais recentes primeiro, paginadas)
```

### Voltar para a origem
Usar `navigate(-1)` no botão Voltar (já é o padrão usado em `LeituraDetalhe.tsx`). Funciona automaticamente para todas as páginas de origem.

### Dados consultados (Supabase)
1. **Obra** (`obras` + `obra_autores → autores` + `edicoes`):
   ```ts
   .from("obras").select(`
     *, 
     obra_autores(ordem, autores(id, nome_completo)),
     edicoes(id, editora, num_paginas, capa_url, isbn_13, idioma)
   `).eq("id", id).maybeSingle()
   ```
   Editora = primeira edição (ou edição preferencial).

2. **Estatísticas** (`usuario_livros`):
   ```ts
   .from("usuario_livros").select("status", { count: "exact", head: false })
     .eq("obra_id", id)
   ```
   Agregar no client por status: `lido|concluido`, `lendo`, `quero_ler`.

3. **Avaliações/resenhas** (`usuario_livros` com `nota` e `review_texto`):
   ```ts
   .select("id, nota, review_texto, updated_at, user_id")
     .eq("obra_id", id).not("nota", "is", null)
   ```
   - Média das notas → estrelas (escala 0–5).
   - Lista de resenhas: filtrar onde `review_texto` não nulo.

4. **Citações** (`leitura_citacoes` via `leituras → usuario_livros.obra_id`):
   ```ts
   .from("leitura_citacoes").select(`
     id, texto, pagina,
     leituras!inner(user_id, usuario_livros!inner(obra_id))
   `).eq("leituras.usuario_livros.obra_id", id).limit(20)
   ```
   (Se a junção indireta não funcionar via PostgREST, usar 2 queries: pegar `leituras.id` cujo `usuario_livro_id` esteja na lista da obra, depois citações.)

5. **Outras obras do autor** (autor principal = `ordem = 1`):
   ```ts
   .from("obra_autores").select("obras(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)")
     .eq("autor_id", autorPrincipalId).neq("obra_id", id).limit(12)
   ```

6. **Verificar se usuário já tem em `usuario_livros`**:
   ```ts
   .from("usuario_livros").select("id, status").eq("user_id", uid).eq("obra_id", id).maybeSingle()
   ```

### Componente de estrelas
Criar inline em `ObraDetalhe.tsx` (ou pequeno helper) — 5 ícones `Star` (lucide-react) preenchidos proporcionalmente à média. Sem dependência nova.

### Redirecionamento dos cliques nas capas
Atualizar onClick em todos estes pontos para `/obras/{obra_id}` em vez de `/leituras/{usuario_livro_id}`:
- `src/pages/Home.tsx` (linhas 67 — "lendo agora", e 112 — últimas leituras)
- `src/pages/Livros.tsx` (linha 64 — grid de meus livros)
- `src/pages/Leituras.tsx` (linhas 91 e 115)
- `src/pages/Busca.tsx` — cards do acervo: hoje só têm botão "Adicionar"; tornar a área da capa+título clicável → `/obras/{obra_id}`.

A rota `/leituras/:id` continua existindo (acessada pelo botão "Abrir minha leitura" dentro de ObraDetalhe).

## Sem mudanças de schema/RLS
- `obras`, `autores`, `obra_autores`, `edicoes` já têm SELECT público.
- `usuario_livros` tem RLS por `auth.uid() = user_id` — isso significa que **estatísticas globais e resenhas de outros usuários NÃO serão visíveis ao usuário** com a query direta.

### Decisão sobre estatísticas/resenhas públicas
Como a RLS atual de `usuario_livros` restringe leitura ao próprio usuário, há duas opções:

**Opção A (recomendada agora — sem migração):**
- Mostrar estatísticas e resenhas baseadas APENAS nos dados do próprio usuário + dados públicos. Ou seja: estatísticas globais e resenhas da comunidade ficam como "em breve" / placeholder.
- Citações: também restritas ao próprio usuário pela RLS de `leitura_citacoes`.

**Opção B (com migração — habilita comunidade):**
- Criar política SELECT pública agregada via uma `view` ou `function` `SECURITY DEFINER` que retorna apenas contagens e resenhas marcadas como públicas (`leitura_pos.publica = true` já existe um padrão similar).
- Adicionar coluna `review_publica boolean default false` em `usuario_livros` e política SELECT permitindo leitura quando `review_publica = true AND nota IS NOT NULL`.
- Idem para `leitura_citacoes` (coluna `publica` ou política derivada).

Vou implementar a **Opção A** nesta entrega para destravar a página agora, com placeholders claros nos blocos de comunidade ("Nenhuma resenha pública ainda"). Se quiser, depois faço a migração da Opção B em uma entrega separada.

## Resumo dos arquivos
**Novo:**
- `src/pages/ObraDetalhe.tsx`

**Editados:**
- `src/App.tsx` — adicionar rota `/obras/:id`
- `src/pages/Home.tsx` — redirecionar capas
- `src/pages/Livros.tsx` — redirecionar capas
- `src/pages/Leituras.tsx` — redirecionar capas
- `src/pages/Busca.tsx` — tornar cards do acervo clicáveis para `/obras/:id`
