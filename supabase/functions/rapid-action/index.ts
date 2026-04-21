import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import slugify from "https://esm.sh/slugify@1.6.6";

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

// =========================
// RETRY
// =========================
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      return null;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

function normalizeAuthor(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function makeSlug(title: string, id?: string) {
  const base = slugify(title, { lower: true, strict: true });
  return id ? `${base}-${id}` : base;
}

async function upsertAutor(nome: string) {
  const normalizado = normalizeAuthor(nome);
  if (!normalizado) return null;
  const { data: existente } = await supabase
    .from("autores")
    .select("id")
    .eq("nome_normalizado", normalizado)
    .maybeSingle();
  if (existente) return { id: existente.id, criado: false };
  const { data, error } = await supabase
    .from("autores")
    .insert({
      nome_completo: nome,
      nome_ordenacao: nome.toLowerCase(),
      nome_normalizado: normalizado,
    })
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

// =========================
// MODOS MANUAIS
// =========================
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
  if (!titulo || !autor) {
    return json({ error: "Título e autor são obrigatórios" }, 400);
  }
  const ano = payload.ano ? parseInt(String(payload.ano).slice(0, 4)) : null;
  const idioma = payload.idioma || "pt-BR";

  const slug = makeSlug(titulo);
  const { data: obra, error: obraErr } = await supabase
    .from("obras")
    .upsert(
      {
        titulo_original: titulo,
        titulo_ordenacao: titulo.toLowerCase(),
        idioma_original: idioma,
        ano_primeira_publicacao: ano,
        sinopse_padrao: payload.sinopse ?? null,
        capa_padrao_url: payload.capa_url ?? null,
        slug,
      },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (obraErr || !obra) {
    return json({ error: obraErr?.message ?? "Falha ao salvar obra" }, 500);
  }

  const todos = [autor, ...((payload.autores_extras ?? []) as string[])].filter(Boolean);
  let ordem = 1;
  for (const nome of todos) {
    const a = await upsertAutor(nome);
    if (a) await vincularAutor(obra.id, a.id, ordem++);
  }

  return json({
    success: true,
    obra: {
      id: obra.id,
      titulo_original: obra.titulo_original,
      capa_padrao_url: obra.capa_padrao_url,
      ano_primeira_publicacao: obra.ano_primeira_publicacao,
      autor,
    },
  });
}

async function handleManualEdicao(payload: any) {
  const obraId = payload.obra_id;
  const tituloEdicao = (payload.titulo_edicao ?? "").toString().trim();
  const editora = (payload.editora ?? "").toString().trim();
  const formato = payload.formato;
  if (!obraId || !tituloEdicao || !editora || !formato) {
    return json({ error: "Campos obrigatórios faltando" }, 400);
  }

  if (payload.isbn_13) {
    const { data: existente } = await supabase
      .from("edicoes")
      .select("id")
      .eq("isbn_13", payload.isbn_13)
      .maybeSingle();
    if (existente) {
      return json({ success: true, edicao: { id: existente.id }, duplicada: true });
    }
  }

  const { data, error } = await supabase
    .from("edicoes")
    .insert({
      obra_id: obraId,
      titulo_edicao: tituloEdicao,
      editora,
      formato,
      idioma: payload.idioma || "pt-BR",
      isbn_13: payload.isbn_13 || null,
      num_paginas: payload.num_paginas ?? null,
      capa_url: payload.capa_url ?? null,
      preco_capa_centavos: payload.preco_capa_centavos ?? null,
      fonte_dados: "manual",
    })
    .select("id")
    .single();
  if (error) return json({ error: error.message }, 500);
  return json({ success: true, edicao: { id: data.id } });
}

// =========================
// BUSCA EXTERNA (modo padrão)
// =========================
async function searchGoogle({ isbn13, titulo, autor }: any) {
  let query = "";
  if (isbn13) query = `isbn:${isbn13}`;
  else if (titulo && autor) query = `intitle:${titulo}+inauthor:${autor}`;
  else if (titulo) query = `intitle:${titulo}`;
  else if (autor) query = `inauthor:${autor}`;

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
  const data = await fetchWithRetry(url);
  if (!data?.items?.length) return null;

  const info = data.items[0].volumeInfo;
  return {
    title: info.title,
    authors: info.authors || [],
    description: info.description,
    publisher: info.publisher,
    pageCount: info.pageCount,
    image: info.imageLinks?.thumbnail,
    language: info.language,
    publishedDate: info.publishedDate,
    isbn13: info.industryIdentifiers?.find((x: any) => x.type === "ISBN_13")?.identifier,
    sourceId: data.items[0].id,
  };
}

async function searchOpenLibrary({ isbn13, titulo, autor }: any) {
  let url = "";

  if (isbn13) {
    url = `https://openlibrary.org/isbn/${isbn13}.json`;
    const data = await fetchWithRetry(url);
    if (!data) return null;
    return {
      title: data.title,
      authors: [],
      description: data.description?.value || data.description,
      publisher: null,
      pageCount: data.number_of_pages,
      image: `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg`,
      language: null,
      publishedDate: data.publish_date,
      isbn13,
      sourceId: isbn13,
    };
  }

  url = `https://openlibrary.org/search.json?title=${encodeURIComponent(titulo || "")}&author=${encodeURIComponent(autor || "")}`;
  const data = await fetchWithRetry(url);
  if (!data?.docs?.length) return null;

  const book = data.docs[0];
  return {
    title: book.title,
    authors: book.author_name || [],
    description: null,
    publisher: book.publisher?.[0],
    pageCount: null,
    image: book.isbn?.[0]
      ? `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-M.jpg`
      : null,
    language: null,
    publishedDate: book.first_publish_year,
    isbn13: book.isbn?.[0],
    sourceId: book.key,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { mode } = payload;

    if (mode === "manual_autor") return await handleManualAutor(payload);
    if (mode === "manual_obra") return await handleManualObra(payload);
    if (mode === "manual_edicao") return await handleManualEdicao(payload);

    // ----- Modo padrão: busca em APIs externas -----
    const { isbn13, titulo, autor } = payload;
    if (!isbn13 && !titulo && !autor) {
      return json({ error: "Informe isbn13, titulo ou autor" }, 400);
    }

    let book = await searchGoogle({ isbn13, titulo, autor });
    if (!book) book = await searchOpenLibrary({ isbn13, titulo, autor });

    if (!book) {
      return json({ error: "Livro não encontrado em nenhuma API" }, 404);
    }

    const slug = makeSlug(book.title, book.sourceId);

    const { data: obra, error: obraErr } = await supabase
      .from("obras")
      .upsert(
        {
          titulo_original: book.title,
          titulo_ordenacao: book.title.toLowerCase(),
          idioma_original: book.language || "pt-BR",
          ano_primeira_publicacao: book.publishedDate
            ? parseInt(book.publishedDate.toString().substring(0, 4))
            : null,
          sinopse_padrao: book.description,
          capa_padrao_url: book.image,
          slug,
        },
        { onConflict: "slug" },
      )
      .select()
      .single();

    if (obraErr || !obra) {
      return json({ error: obraErr?.message || "Falha ao salvar obra" }, 500);
    }

    const obraId = obra.id;

    for (const nome of book.authors || []) {
      const a = await upsertAutor(nome);
      if (a) await vincularAutor(obraId, a.id, 1);
    }

    if (book.isbn13) {
      const { data: exist } = await supabase
        .from("edicoes")
        .select("id")
        .eq("isbn_13", book.isbn13)
        .maybeSingle();

      if (!exist) {
        await supabase.from("edicoes").insert({
          obra_id: obraId,
          isbn_13: book.isbn13,
          titulo_edicao: book.title,
          editora: book.publisher || "Desconhecida",
          formato: "ebook",
          idioma: book.language || "pt-BR",
          num_paginas: book.pageCount,
          capa_url: book.image,
          fonte_dados: "api",
        });
      }
    }

    return json({
      success: true,
      obra: {
        id: obraId,
        titulo_original: book.title,
        capa_padrao_url: book.image,
        ano_primeira_publicacao: book.publishedDate
          ? parseInt(book.publishedDate.toString().substring(0, 4))
          : null,
        autor: (book.authors || [])[0] || null,
      },
      fonte: book.isbn13 ? "google/openlibrary" : "fallback",
    });
  } catch (err: any) {
    return json({ error: err?.message || "Erro interno" }, 500);
  }
});
