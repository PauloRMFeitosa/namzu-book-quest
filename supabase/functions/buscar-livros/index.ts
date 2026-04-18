import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExternalBook {
  source: "google" | "openlibrary";
  external_id?: string;
  titulo: string;
  autor?: string;
  autores?: string[];
  ano?: number | null;
  capa_url?: string | null;
  isbn_13?: string | null;
  editora?: string | null;
  num_paginas?: number | null;
  sinopse?: string | null;
  idioma?: string | null;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function searchGoogle(titulo: string, autor: string): Promise<ExternalBook[]> {
  const q: string[] = [];
  if (titulo) q.push(`intitle:${titulo}`);
  if (autor) q.push(`inauthor:${autor}`);
  const query = q.join("+") || titulo || autor;
  if (!query) return [];
  try {
    const r = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books`,
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j.items ?? []).map((it: any): ExternalBook => {
      const v = it.volumeInfo ?? {};
      const isbn13 = (v.industryIdentifiers ?? []).find((x: any) => x.type === "ISBN_13")?.identifier ?? null;
      return {
        source: "google",
        external_id: it.id,
        titulo: v.title ?? "Sem título",
        autor: (v.authors ?? [])[0],
        autores: v.authors ?? [],
        ano: v.publishedDate ? parseInt(String(v.publishedDate).slice(0, 4)) || null : null,
        capa_url: v.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
        isbn_13: isbn13,
        editora: v.publisher ?? null,
        num_paginas: v.pageCount ?? null,
        sinopse: v.description ?? null,
        idioma: v.language ?? null,
      };
    });
  } catch {
    return [];
  }
}

async function searchOpenLibrary(titulo: string, autor: string): Promise<ExternalBook[]> {
  const params = new URLSearchParams();
  if (titulo) params.set("title", titulo);
  if (autor) params.set("author", autor);
  params.set("limit", "20");
  if ([...params.keys()].filter((k) => k !== "limit").length === 0) return [];
  try {
    const r = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.docs ?? []).slice(0, 20).map((d: any): ExternalBook => ({
      source: "openlibrary",
      external_id: d.key,
      titulo: d.title ?? "Sem título",
      autor: (d.author_name ?? [])[0],
      autores: d.author_name ?? [],
      ano: d.first_publish_year ?? null,
      capa_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
      isbn_13: (d.isbn ?? []).find((x: string) => x.length === 13) ?? null,
      editora: (d.publisher ?? [])[0] ?? null,
      num_paginas: d.number_of_pages_median ?? null,
      sinopse: null,
      idioma: (d.language ?? [])[0] ?? null,
    }));
  } catch {
    return [];
  }
}

function dedupe(books: ExternalBook[]): ExternalBook[] {
  const seen = new Set<string>();
  const out: ExternalBook[] = [];
  for (const b of books) {
    const key = b.isbn_13 || `${b.titulo.toLowerCase()}|${(b.autor ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "search";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    if (action === "search") {
      const titulo = String(body.titulo ?? "").trim();
      const autor = String(body.autor ?? "").trim();
      if (!titulo && !autor) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const [g, o] = await Promise.all([searchGoogle(titulo, autor), searchOpenLibrary(titulo, autor)]);
      const results = dedupe([...g, ...o]);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add") {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Não autenticado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = userData.user.id;
      const book: ExternalBook = body.book;
      if (!book?.titulo) {
        return new Response(JSON.stringify({ error: "Livro inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Tenta achar obra existente por ISBN (via edicoes) ou por titulo+autor
      let obraId: string | null = null;
      if (book.isbn_13) {
        const { data: ed } = await supabase
          .from("edicoes")
          .select("obra_id")
          .eq("isbn_13", book.isbn_13)
          .maybeSingle();
        if (ed?.obra_id) obraId = ed.obra_id;
      }
      if (!obraId) {
        const { data: ob } = await supabase
          .from("obras")
          .select("id")
          .eq("titulo_ordenacao", book.titulo.toLowerCase())
          .maybeSingle();
        if (ob?.id) obraId = ob.id;
      }

      // 2) Cria obra se não existir
      if (!obraId) {
        const slug = `${slugify(book.titulo)}-${Date.now().toString(36)}`;
        const { data: novaObra, error: oErr } = await supabase
          .from("obras")
          .insert({
            titulo_original: book.titulo,
            titulo_ordenacao: book.titulo.toLowerCase(),
            slug,
            capa_padrao_url: book.capa_url,
            ano_primeira_publicacao: book.ano ?? null,
            sinopse_padrao: book.sinopse ?? null,
            idioma_original: book.idioma ?? "pt-BR",
          })
          .select("id")
          .single();
        if (oErr) {
          return new Response(JSON.stringify({ error: oErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        obraId = novaObra.id;

        // autores
        for (const nome of book.autores ?? (book.autor ? [book.autor] : [])) {
          if (!nome) continue;
          let autorId: string | null = null;
          const { data: autorEx } = await supabase
            .from("autores")
            .select("id")
            .eq("nome_ordenacao", nome.toLowerCase())
            .maybeSingle();
          if (autorEx?.id) autorId = autorEx.id;
          else {
            const { data: novoAutor } = await supabase
              .from("autores")
              .insert({ nome_completo: nome, nome_ordenacao: nome.toLowerCase() })
              .select("id")
              .single();
            autorId = novoAutor?.id ?? null;
          }
          if (autorId) {
            await supabase.from("obra_autores").insert({ obra_id: obraId, autor_id: autorId });
          }
        }

        // edição (se temos dados)
        if (book.isbn_13 || book.editora || book.num_paginas) {
          await supabase.from("edicoes").insert({
            obra_id: obraId,
            titulo_edicao: book.titulo,
            editora: book.editora ?? "Desconhecida",
            formato: "fisico",
            idioma: book.idioma ?? "pt-BR",
            isbn_13: book.isbn_13 ?? null,
            num_paginas: book.num_paginas ?? null,
            capa_url: book.capa_url ?? null,
            fonte_dados: book.source,
          });
        }
      }

      // 3) Adiciona ao acervo do usuário
      const { error: ulErr } = await supabase.from("usuario_livros").insert({
        user_id: userId,
        obra_id: obraId!,
        status: "quero_ler",
      });
      if (ulErr && ulErr.code !== "23505") {
        return new Response(JSON.stringify({ error: ulErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ obra_id: obraId, duplicado: ulErr?.code === "23505" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
