// rapid-action — escreve no banco (obras, edições, autores, gêneros)
// Busca externa delegada para search-books (sem duplicação de lógica)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import slugify from "https://esm.sh/slugify@1.6.6";
import { autenticarUsuario } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─────────────────────────────────────────────────────────────────────────────
// Gêneros — inlined (não depende de _shared/)
// ─────────────────────────────────────────────────────────────────────────────

const TRANSLATIONS: Record<string, string> = {
  "business & economics": "Negócios", "business": "Negócios",
  "economics": "Economia", "self-help": "Autoajuda",
  "philosophy": "Filosofia", "history": "História",
  "religion": "Religião", "psychology": "Psicologia",
  "science": "Ciência", "fantasy": "Fantasia",
  "science fiction": "Ficção Científica", "sci-fi": "Ficção Científica",
  "fiction": "Ficção", "non-fiction": "Não Ficção", "nonfiction": "Não Ficção",
  "biography & autobiography": "Biografia", "biography": "Biografia",
  "autobiography": "Biografia", "comics & graphic novels": "Quadrinhos",
  "comics": "Quadrinhos", "graphic novels": "Quadrinhos",
  "literary collections": "Literatura", "literature": "Literatura",
  "poetry": "Poesia", "political science": "Política", "politics": "Política",
  "education": "Educação", "health & fitness": "Saúde",
  "health": "Saúde", "fitness": "Saúde",
  "computers": "Tecnologia", "technology": "Tecnologia",
  "art": "Arte", "arts": "Arte", "travel": "Viagem",
  "young adult fiction": "Jovem Adulto", "young adult": "Jovem Adulto",
  "juvenile fiction": "Infantojuvenil", "juvenile nonfiction": "Infantojuvenil",
  "juvenile": "Infantojuvenil", "children": "Infantil",
  "children's books": "Infantil", "body, mind & spirit": "Espiritualidade",
  "spirituality": "Espiritualidade", "literary criticism": "Crítica Literária",
  "social science": "Ciências Sociais", "sociology": "Sociologia",
  "anthropology": "Antropologia", "cooking": "Culinária",
  "mathematics": "Matemática", "medical": "Medicina",
  "music": "Música", "law": "Direito", "drama": "Drama",
  "humor": "Humor", "romance": "Romance", "thriller": "Suspense",
  "thrillers": "Suspense", "mystery": "Mistério", "horror": "Terror",
  "adventure": "Aventura", "essays": "Ensaios", "reference": "Referência",
  "language arts & disciplines": "Linguagem", "epic": "Épico",
  "epic literature": "Épico", "short stories": "Contos",
  "novel": "Romance", "novels": "Romance",
};

const STOP = new Set(["general", "books", "subjects", "topic", "books and reading", "reading", "miscellaneous"]);

function toTitleCase(s: string) {
  return s.toLowerCase().split(/\s+/).map((w) => w.length ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
}

function translateGenre(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (TRANSLATIONS[key]) return TRANSLATIONS[key];
  const noPunct = key.replace(/[.,;:!?"]/g, "").trim();
  if (TRANSLATIONS[noPunct]) return TRANSLATIONS[noPunct];
  return toTitleCase(raw.trim());
}

function normalizeGenres(input: unknown): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  const out = new Set<string>();
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const parts = item.split(/[\/>]|--|,/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    for (const p of parts) {
      if (STOP.has(p.toLowerCase())) continue;
      const translated = translateGenre(p);
      if (translated.length >= 2) out.add(translated);
    }
  }
  return Array.from(out);
}

function slugifyGenre(nome: string): string {
  return nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function persistGenresForObra(obraId: string, rawGenres: unknown): Promise<{ nomes: string[]; ids: string[] }> {
  const nomes = normalizeGenres(rawGenres);
  if (!nomes.length || !obraId) return { nomes: [], ids: [] };
  const ids: string[] = [];
  for (const nome of nomes) {
    const slug = slugifyGenre(nome);
    if (!slug) continue;
    let { data: existing } = await supabase.from("generos").select("id").eq("slug", slug).maybeSingle();
    let generoId: string | null = existing?.id ?? null;
    if (!generoId) {
      const { data: inserted, error } = await supabase.from("generos").insert({ nome, slug }).select("id").single();
      if (error) {
        const { data: again } = await supabase.from("generos").select("id").eq("slug", slug).maybeSingle();
        generoId = again?.id ?? null;
      } else {
        generoId = inserted.id;
      }
    }
    if (generoId) ids.push(generoId);
  }
  if (ids.length) {
    try {
      await supabase.from("obra_generos").upsert(
        ids.map((genero_id) => ({ obra_id: obraId, genero_id })),
        { onConflict: "obra_id,genero_id", ignoreDuplicates: true },
      );
    } catch { /* ignora */ }
  }
  return { nomes, ids };
}

// ─────────────────────────────────────────────────────────────────────────────
// Busca externa — delega para search-books (sem duplicação)
// ─────────────────────────────────────────────────────────────────────────────

interface SearchResult {
  titulo: string;
  autores: string[];
  ano: number | null;
  capa_url: string | null;
  isbn13: string | null;
  fonte: string;
  descricao?: string | null;
  editora?: string | null;
  num_paginas?: number | null;
  idioma?: string | null;
  generos?: string[];
}

async function searchViaSearchBooks(params: { titulo?: string; autor?: string; isbn?: string }): Promise<SearchResult | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(`${supabaseUrl}/functions/v1/search-books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const { results } = await res.json();
    return results?.[0] ?? null;
  } catch (e) {
    console.warn("searchViaSearchBooks failed", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de persistência
// ─────────────────────────────────────────────────────────────────────────────

function normalizeFormato(formato?: string | null): string {
  const f = (formato ?? "").toLowerCase().trim();
  if (f === "fisico_capa_dura") return "fisico_capa_dura";
  if (f === "ebook") return "ebook";
  if (f === "audiobook") return "audiobook";
  return "fisico_brochura";
}

function normalizeAuthor(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").trim();
}

function makeSlug(title: string, id?: string) {
  const base = slugify(title, { lower: true, strict: true });
  return id ? `${base}-${id}` : base;
}

async function upsertAutor(nome: string) {
  const normalizado = normalizeAuthor(nome);
  if (!normalizado) return null;
  const { data: existente } = await supabase.from("autores").select("id").eq("nome_normalizado", normalizado).maybeSingle();
  if (existente) return { id: existente.id, criado: false };
  const { data, error } = await supabase
    .from("autores")
    .insert({ nome_completo: nome, nome_ordenacao: nome.toLowerCase(), nome_normalizado: normalizado })
    .select("id")
    .single();
  if (error) return null;
  return { id: data.id, criado: true };
}

async function vincularAutor(obraId: string, autorId: string, ordem: number) {
  await supabase.from("obra_autores").upsert(
    { obra_id: obraId, autor_id: autorId, funcao: "autor", ordem },
    { onConflict: "obra_id,autor_id,funcao" },
  );
}

async function upsertObraComAutores(input: {
  titulo: string;
  autores: string[];
  ano: number | null;
  idioma: string | null;
  sinopse: string | null;
  capa_url: string | null;
  sourceId?: string | null;
  generos?: unknown;
}) {
  const slug = makeSlug(input.titulo, input.sourceId ?? undefined);
  const { data: existente } = await supabase
    .from("obras")
    .select("id, titulo_original, capa_padrao_url, ano_primeira_publicacao")
    .eq("slug", slug)
    .maybeSingle();

  let obra = existente;
  if (!obra) {
    const { data, error } = await supabase
      .from("obras")
      .insert({
        titulo_original: input.titulo,
        titulo_ordenacao: input.titulo.toLowerCase(),
        idioma_original: input.idioma || "pt-BR",
        ano_primeira_publicacao: input.ano,
        sinopse_padrao: input.sinopse,
        capa_padrao_url: input.capa_url,
        slug,
      })
      .select("id, titulo_original, capa_padrao_url, ano_primeira_publicacao")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Falha ao criar obra");
    obra = data;
  }

  let ordem = 1;
  for (const nome of input.autores ?? []) {
    if (!nome) continue;
    const a = await upsertAutor(nome);
    if (a) await vincularAutor(obra.id, a.id, ordem++);
  }

  let generosInfo = { nomes: [] as string[], ids: [] as string[] };
  try {
    generosInfo = await persistGenresForObra(obra.id, input.generos);
  } catch (e) {
    console.warn("persistGenresForObra falhou", e);
  }

  return { ...obra, generos: generosInfo.nomes, generos_ids: generosInfo.ids };
}

async function upsertEdicaoParaObra(
  obraId: string,
  input: { titulo: string; isbn13?: string | null; editora?: string | null; num_paginas?: number | null; capa_url?: string | null; idioma?: string | null; formato?: string | null },
): Promise<{ id: string; criada: boolean }> {
  if (input.isbn13) {
    const { data: existente } = await supabase.from("edicoes").select("id").eq("isbn_13", input.isbn13).maybeSingle();
    if (existente) return { id: existente.id, criada: false };
  }
  const { data: edicaoExistente } = await supabase.from("edicoes").select("id").eq("obra_id", obraId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (edicaoExistente && !input.isbn13 && !input.editora) return { id: edicaoExistente.id, criada: false };

  const { data, error } = await supabase
    .from("edicoes")
    .insert({
      obra_id: obraId,
      titulo_edicao: input.titulo,
      editora: input.editora || "Não informada",
      formato: normalizeFormato(input.formato),
      idioma: input.idioma || "pt-BR",
      isbn_13: input.isbn13 || null,
      num_paginas: input.num_paginas ?? null,
      capa_url: input.capa_url ?? null,
      fonte_dados: "api",
    })
    .select("id")
    .single();
  if (error) {
    if (edicaoExistente) return { id: edicaoExistente.id, criada: false };
    throw new Error(error.message);
  }
  return { id: data.id, criada: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers de modo
// ─────────────────────────────────────────────────────────────────────────────

async function handleRegistrarResultado(payload: any) {
  const titulo = String(payload.titulo ?? "").trim();
  if (!titulo) return json({ error: "Título obrigatório" }, 400);

  const obra = await upsertObraComAutores({
    titulo,
    autores: Array.isArray(payload.autores) ? payload.autores : [],
    ano: payload.ano ?? null,
    idioma: payload.idioma ?? null,
    sinopse: payload.descricao ?? payload.sinopse ?? null,
    capa_url: payload.capa_url ?? null,
    sourceId: payload.sourceId ?? payload.isbn13 ?? null,
    generos: payload.generos ?? payload.categories ?? payload.subjects ?? null,
  });

  let edicaoId: string | null = null;
  try {
    const edicao = await upsertEdicaoParaObra(obra.id, {
      titulo,
      isbn13: payload.isbn13 ?? null,
      editora: payload.editora ?? null,
      num_paginas: payload.num_paginas ?? null,
      capa_url: payload.capa_url ?? null,
      idioma: payload.idioma ?? null,
      formato: payload.formato ?? null,
    });
    edicaoId = edicao.id;
  } catch (e) {
    console.warn("edicao step failed", e);
  }

  return json({
    success: true,
    obra: {
      id: obra.id,
      titulo_original: obra.titulo_original,
      capa_padrao_url: obra.capa_padrao_url,
      ano_primeira_publicacao: obra.ano_primeira_publicacao,
      autor: (payload.autores ?? [])[0] ?? null,
      generos: (obra as any).generos ?? [],
      generos_ids: (obra as any).generos_ids ?? [],
    },
    edicao_id: edicaoId,
    edicao: edicaoId ? { id: edicaoId } : null,
  });
}

async function handleManualAutor(payload: any) {
  const nome = (payload.nome ?? "").toString().trim();
  if (!nome) return json({ error: "Nome obrigatório" }, 400);
  const r = await upsertAutor(nome);
  if (!r) return json({ error: "Falha ao salvar autor" }, 500);
  return json({ success: true, autor: { id: r.id, nome }, criado: r.criado });
}

async function handleManualObra(payload: any) {
  const titulo = (payload.titulo ?? "").toString().trim();
  const autor = (payload.autor ?? "").toString().trim();
  if (!titulo || !autor) return json({ error: "Título e autor são obrigatórios" }, 400);
  const ano = payload.ano ? parseInt(String(payload.ano).slice(0, 4)) : null;
  const idioma = payload.idioma || "pt-BR";
  const slug = makeSlug(titulo);

  const { data: obra, error: obraErr } = await supabase
    .from("obras")
    .upsert(
      { titulo_original: titulo, titulo_ordenacao: titulo.toLowerCase(), idioma_original: idioma, ano_primeira_publicacao: ano, sinopse_padrao: payload.sinopse ?? null, capa_padrao_url: payload.capa_url ?? null, slug },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (obraErr || !obra) return json({ error: obraErr?.message ?? "Falha ao salvar obra" }, 500);

  const todos = [autor, ...((payload.autores_extras ?? []) as string[])].filter(Boolean);
  let ordem = 1;
  for (const nome of todos) {
    const a = await upsertAutor(nome);
    if (a) await vincularAutor(obra.id, a.id, ordem++);
  }

  let edicaoId: string | null = null;
  try {
    const edicao = await upsertEdicaoParaObra(obra.id, { titulo, isbn13: payload.isbn_13 ?? null, editora: payload.editora ?? null, num_paginas: payload.num_paginas ?? null, capa_url: payload.capa_url ?? null, idioma, formato: payload.formato ?? null });
    edicaoId = edicao.id;
  } catch (e) {
    console.warn("edicao step failed in manual_obra", e);
  }

  return json({ success: true, obra: { id: obra.id, titulo_original: obra.titulo_original, capa_padrao_url: obra.capa_padrao_url, ano_primeira_publicacao: obra.ano_primeira_publicacao, autor }, edicao_id: edicaoId, edicao: edicaoId ? { id: edicaoId } : null });
}

async function handleManualEdicao(payload: any) {
  const obraId = payload.obra_id;
  const tituloEdicao = (payload.titulo_edicao ?? "").toString().trim();
  const editora = (payload.editora ?? "").toString().trim();
  if (!obraId || !tituloEdicao || !editora) return json({ error: "Campos obrigatórios faltando" }, 400);

  if (payload.isbn_13) {
    const { data: existente } = await supabase.from("edicoes").select("id").eq("isbn_13", payload.isbn_13).maybeSingle();
    if (existente) return json({ success: true, edicao: { id: existente.id }, duplicada: true });
  }

  const { data, error } = await supabase
    .from("edicoes")
    .insert({ obra_id: obraId, titulo_edicao: tituloEdicao, editora, formato: normalizeFormato(payload.formato), idioma: payload.idioma || "pt-BR", isbn_13: payload.isbn_13 || null, num_paginas: payload.num_paginas ?? null, capa_url: payload.capa_url ?? null, preco_capa_centavos: payload.preco_capa_centavos ?? null, fonte_dados: "manual" })
    .select("id")
    .single();
  if (error) return json({ error: error.message }, 500);
  return json({ success: true, edicao: { id: data.id } });
}

// Modo padrão: busca via search-books e persiste o primeiro resultado
async function handleBuscarERegistrar(payload: any) {
  const { isbn13, titulo, autor } = payload;
  if (!isbn13 && !titulo && !autor) return json({ error: "Informe isbn13, titulo ou autor" }, 400);

  const book = await searchViaSearchBooks({ isbn: isbn13, titulo, autor });
  if (!book) return json({ error: "Livro não encontrado em nenhuma API" }, 404);

  const obra = await upsertObraComAutores({
    titulo: book.titulo,
    autores: book.autores ?? [],
    ano: book.ano ?? null,
    idioma: book.idioma ?? null,
    sinopse: book.descricao ?? null,
    capa_url: book.capa_url ?? null,
    sourceId: book.isbn13 ?? isbn13 ?? titulo,
    generos: book.generos ?? null,
  });

  let edicaoId: string | null = null;
  try {
    const edicao = await upsertEdicaoParaObra(obra.id, {
      titulo: book.titulo,
      isbn13: book.isbn13 ?? null,
      editora: book.editora ?? null,
      num_paginas: book.num_paginas ?? null,
      capa_url: book.capa_url ?? null,
      idioma: book.idioma ?? null,
      formato: "fisico_brochura",
    });
    edicaoId = edicao.id;
  } catch (e) {
    console.warn("edicao step failed", e);
  }

  return json({
    success: true,
    obra: { id: obra.id, titulo_original: obra.titulo_original, capa_padrao_url: obra.capa_padrao_url, ano_primeira_publicacao: obra.ano_primeira_publicacao, autor: book.autores?.[0] ?? null, generos: (obra as any).generos ?? [], generos_ids: (obra as any).generos_ids ?? [] },
    edicao_id: edicaoId,
    edicao: edicaoId ? { id: edicaoId } : null,
    fonte: book.fonte ?? "search-books",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Esta função grava no acervo com a chave de serviço (sem RLS), então só
    // atende usuários autenticados. Todas as chamadas do app partem de
    // páginas protegidas e já enviam o JWT da sessão.
    const auth = await autenticarUsuario(req);
    if (!auth.ok) return json({ error: auth.erro }, auth.status);

    const payload = await req.json();
    const { mode } = payload;
    if (mode === "manual_autor") return await handleManualAutor(payload);
    if (mode === "manual_obra") return await handleManualObra(payload);
    if (mode === "manual_edicao") return await handleManualEdicao(payload);
    if (mode === "registrar_resultado") return await handleRegistrarResultado(payload);
    // Modo padrão: busca via search-books e persiste
    return await handleBuscarERegistrar(payload);
  } catch (err: any) {
    return json({ error: err?.message || "Erro interno" }, 500);
  }
});
