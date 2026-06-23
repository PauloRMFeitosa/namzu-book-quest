# RN-ONB-01 e RN-ONB-02 — Preferências de onboarding e estante inicial

**Módulo:** Onboarding  
**Migration:** `fase1_onboarding_perfil_preferencias`  
**Status:** Implementado (Fase 1)

---

## RN-ONB-01 — Match de clubes por gosto

**Função:** `public.match_clubes_por_gosto(p_generos text[], p_objetivo text)`  
**Acesso:** `anon` + `authenticated` (pode ser chamada antes do signup para pré-visualização)

### Regra

Dado o array de slugs de gênero e o objetivo declarado pelo usuário no quiz, retorna os 3 clubes públicos ativos com maior afinidade, ordenados por score decrescente.

### Fórmula de pontuação

```
score = (gêneros em comum × 3) + (objetivo compatível × 2)
```

**Gêneros em comum:** quantidade de slugs em `p_generos` que pertencem aos gêneros associados à categoria do clube.

**Mapeamento categoria → gêneros:**

| Categoria do clube | Slugs de gênero associados |
|--------------------|---------------------------|
| `ficcao` | `ficcao`, `literatura` |
| `filosofia` | `filosofia` |
| `historia` | `historia` |
| `desenvolvimento` | `autoajuda`, `psicologia` |
| `infantojuvenil` | `infantojuvenil`, `jovem-adulto` |
| `biografia` | `biografia` |
| `espiritualidade` | `religiao`, `filosofia` |
| `classicos` | `literatura`, `ficcao`, `poesia` |
| `fantasia` | `ficcao`, `jovem-adulto` |
| `negocios` | `negocios` |

**Bônus por objetivo:**

| Objetivo | Categorias com bônus |
|----------|---------------------|
| `ler_mais` | `desenvolvimento`, `classicos`, `biografia` |
| `descobrir` | `ficcao`, `fantasia`, `classicos`, `historia` |
| `comunidade` | `ficcao`, `filosofia`, `fantasia`, `negocios` |

### Exemplos testados

| Gêneros | Objetivo | Resultado |
|---------|----------|-----------|
| `['ficcao', 'filosofia']` | `descobrir` | Clube de Fantasia, Clube de Ficção, Clube dos Clássicos (score 5) |
| `['negocios', 'autoajuda']` | `ler_mais` | Clube de Desenvolvimento Pessoal + 2 clubes de categoria `desenvolvimento` (score 5) |

---

## RN-ONB-02 — Seed de estante inicial

**Função:** `public.seed_estante_inicial(p_user_id uuid)`  
**Acesso:** `authenticated` | Valida `auth.uid() = p_user_id`

### Regra

Imediatamente após o INSERT em `perfil_preferencias` (merge pós-signup), popula a `usuario_livros` do novo usuário com até 12 obras dos gêneros preferidos, com status `quero_ler`.

### Condições de exclusão (ordem de prioridade)

1. Obras em `livros_amados` (quiz tela 3) — o frontend as adiciona separadamente com status `lido`
2. Obras já presentes em `usuario_livros` do usuário — idempotência via `NOT EXISTS` + `ON CONFLICT DO NOTHING`

### Seleção de edição

Para cada obra, escolhe a primeira edição disponível (`ORDER BY edicao_id ASC`). O usuário pode trocar a edição depois.

### Idempotência

A função pode ser chamada mais de uma vez sem duplicar registros:
- `NOT EXISTS` filtra obras já presentes
- `ON CONFLICT (user_id, obra_id) DO NOTHING` garante a atomicidade mesmo em race conditions

### Sequência de merge pós-signup

```
1. INSERT INTO perfil_preferencias (generos, livros_amados, ritmo, objetivo)
2. SELECT rpc('seed_estante_inicial', { p_user_id })
3. SELECT rpc('match_clubes_por_gosto', { p_generos, p_objetivo }) → top 3 clubes
4. INSERT INTO clube_membros (clube_id, user_id) para cada clube escolhido
5. UPDATE perfis SET onboarding_completo = true
6. localStorage.removeItem('namzu_onboarding')
```

---

## Tabela: `perfil_preferencias`

| Coluna | Tipo | Restrição |
|--------|------|-----------|
| `user_id` | `uuid` | PK, FK → `auth.users`, CASCADE DELETE |
| `generos` | `text[]` | NOT NULL, default `'{}'` — slugs da tabela `generos` |
| `livros_amados` | `uuid[]` | NOT NULL, default `'{}'` — IDs da tabela `obras` |
| `ritmo` | `text` | `IN ('lento', 'moderado', 'intenso')` |
| `objetivo` | `text` | `IN ('ler_mais', 'descobrir', 'comunidade')` |
| `criado_em` | `timestamptz` | NOT NULL, `now()` |
| `atualizado_em` | `timestamptz` | NOT NULL, atualizado por trigger |

**RLS:** cada usuário lê e escreve apenas o próprio registro.
