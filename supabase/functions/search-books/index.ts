// Edge function: search-books
// Apenas BUSCA em fontes externas (Google Books + Open Library) e retorna resultados normalizados.
// NÃO escreve em banco.

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
}

function isIsbn(s: string) {
  const digits = s.replace(/[-\s]/g, "");
  return /^\d{13}$/.test(digits) || /^\d{10}$/.test(digits);
}

function parseYear(v: any): number | null {
  if (!v) return null;
  const m = String(v).match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
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

async function searchGoogle(query: string): Promise<BookResult[]> {
  const isbn = isIsbn(query) ? query.replace(/[-\s]/g, "") : null;
  const q = isbn ? `isbn:${isbn}` : query;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`;
  const data = await safeJson(url);
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
      };
    })
    .filter(Boolean) as BookResult[];
}

async function searchOpenLibrary(query: string): Promise<BookResult[]> {
  const isbn = isIsbn(query) ? query.replace(/[-\s]/g, "") : null;
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
      },
    ];
  }
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
  const data = await safeJson(url);
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
    const query = String(body?.query ?? "").trim();
    if (query.length < 3) {
      return json({ results: [] });
    }

    const [google, ol] = await Promise.all([
      searchGoogle(query).catch(() => []),
      searchOpenLibrary(query).catch(() => []),
    ]);

    // Prioriza Google (geralmente capas/metadata melhores) e completa com Open Library
    const results = dedupe([...google, ...ol]).slice(0, 20);
    return json({ results });
  } catch (err: any) {
    console.error("search-books error", err);
    return json({ results: [], error: err?.message ?? "internal" }, 200);
  }
});
