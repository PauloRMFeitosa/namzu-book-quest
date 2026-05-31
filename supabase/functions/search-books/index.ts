// Edge function: search-books
// Apenas BUSCA em fontes externas (Google Books + Open Library) e retorna resultados normalizados.
// NÃO escreve em banco.

import { normalizeGenres } from "../_shared/generos.ts";


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

interface BookResult {
  titulo: string;
  autores: string[];
  ano: number | null;
  capa_url: string | null;
  isbn13: string | null;
  fonte: "google" | "openlibrary";
  descricao?: string | null;
  editora?: string | null;
  num_paginas?: number | null;
  idioma?: string | null;
  generos?: string[];
}


function parseYear(v: any): number | null {
  if (!v) return null;
  const m = String(v).match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

function normalizeIsbn(s?: string | null): string | null {
  if (!s) return null;
  const d = String(s).replace(/[-\s]/g, "");
  return /^\d{10}$|^\d{13}$/.test(d) ? d : null;
}

async function safeJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildGoogleQuery({ titulo, autor, isbn, query }: any): string | null {
  if (isbn) return `isbn:${isbn}`;
  const parts: string[] = [];
  if (titulo) parts.push(`intitle:${titulo}`);
  if (autor) parts.push(`inauthor:${autor}`);
  if (parts.length) return parts.join("+");
  if (query) return query;
  return null;
}

async function searchGoogle(params: any): Promise<BookResult[]> {
  const q = buildGoogleQuery(params);
  if (!q) return [];
  const key = Deno.env.get("GOOGLE_BOOKS_API_KEY");
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10${keyParam}`;
  const res = await fetch(url).catch(() => null);
  if (!res) return [];
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.warn("Google Books error", res.status, txt.slice(0, 200));
    return [];
  }
  const data = await res.json().catch(() => null);
  if (!data?.items?.length) return [];
  return data.items
    .map((item: any): BookResult | null => {
      const info = item.volumeInfo || {};
      if (!info.title) return null;
      const isbn13 =
        info.industryIdentifiers?.find((x: any) => x.type === "ISBN_13")?.identifier ?? null;
      const img =
        info.imageLinks?.thumbnail?.replace(/^http:/, "https:") ??
        info.imageLinks?.smallThumbnail?.replace(/^http:/, "https:") ??
        null;
      return {
        titulo: info.title,
        autores: info.authors ?? [],
        ano: parseYear(info.publishedDate),
        capa_url: img,
        isbn13,
        fonte: "google",
        descricao: info.description ?? null,
        editora: info.publisher ?? null,
        num_paginas: info.pageCount ?? null,
        idioma: info.language ?? null,
        generos: normalizeGenres(info.categories),
      };

    })
    .filter(Boolean) as BookResult[];
}

async function searchOpenLibrary({ titulo, autor, isbn, query }: any): Promise<BookResult[]> {
  if (isbn) {
    const data = await safeJson(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!data?.title) return [];
    return [
      {
        titulo: data.title,
        autores: [],
        ano: parseYear(data.publish_date),
        capa_url: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
        isbn13: isbn,
        fonte: "openlibrary",
        num_paginas: data.number_of_pages ?? null,
        generos: normalizeGenres(data.subjects),
      },
    ];
  }

  const params = new URLSearchParams();
  if (titulo) params.set("title", titulo);
  if (autor) params.set("author", autor);
  if (!titulo && !autor && query) params.set("q", query);
  if (![...params.keys()].length) return [];
  params.set("limit", "10");
  const data = await safeJson(`https://openlibrary.org/search.json?${params.toString()}`);
  if (!data?.docs?.length) return [];
  return data.docs
    .map((doc: any): BookResult | null => {
      if (!doc.title) return null;
      const isbn13 = doc.isbn?.find((x: string) => x.length === 13) ?? doc.isbn?.[0] ?? null;
      return {
        titulo: doc.title,
        autores: doc.author_name ?? [],
        ano: doc.first_publish_year ?? null,
        capa_url: isbn13
          ? `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg`
          : doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
        isbn13,
        fonte: "openlibrary",
        editora: doc.publisher?.[0] ?? null,
        generos: normalizeGenres(doc.subject),
      };
    })

    .filter(Boolean) as BookResult[];
}

function dedupe(list: BookResult[]): BookResult[] {
  const seen = new Set<string>();
  const out: BookResult[] = [];
  for (const b of list) {
    const key = b.isbn13
      ? `i:${b.isbn13}`
      : `t:${b.titulo.toLowerCase().trim()}|${(b.autores[0] ?? "").toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const titulo = String(body?.titulo ?? "").trim();
    const autor = String(body?.autor ?? "").trim();
    const isbn = normalizeIsbn(body?.isbn ?? body?.isbn13);
    const query = String(body?.query ?? "").trim();

    const hasAny = titulo.length >= 2 || autor.length >= 2 || isbn || query.length >= 3;
    if (!hasAny) return json({ results: [] });

    const params = { titulo, autor, isbn, query };

    const [google, ol] = await Promise.all([
      searchGoogle(params).catch(() => []),
      searchOpenLibrary(params).catch(() => []),
    ]);

    const results = dedupe([...google, ...ol]).slice(0, 20);
    return json({ results });
  } catch (err: any) {
    console.error("search-books error", err);
    return json({ results: [], error: err?.message ?? "internal" }, 200);
  }
});
