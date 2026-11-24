// Edge function: reprocessar-generos v7
// Tudo inlined — sem import de _shared para evitar versão antiga em cache.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Gêneros (inlined de _shared/generos.ts) ──

const TRANSLATIONS: Record<string, string> = {
  "business & economics": "Negócios", "business": "Negócios", "economics": "Economia",
  "self-help": "Autoajuda", "philosophy": "Filosofia", "history": "História",
  "religion": "Religião", "psychology": "Psicologia", "science": "Ciência",
  "fantasy": "Fantasia", "science fiction": "Ficção Científica", "sci-fi": "Ficção Científica",
  "fiction": "Ficção", "non-fiction": "Não Ficção", "nonfiction": "Não Ficção",
  "biography & autobiography": "Biografia", "biography": "Biografia", "autobiography": "Biografia",
  "comics & graphic novels": "Quadrinhos", "comics": "Quadrinhos", "graphic novels": "Quadrinhos",
  "literary collections": "Literatura", "literature": "Literatura", "poetry": "Poesia",
  "political science": "Política", "politics": "Política", "education": "Educação",
  "health & fitness": "Saúde", "health": "Saúde", "fitness": "Saúde",
  "computers": "Tecnologia", "technology": "Tecnologia", "art": "Arte", "arts": "Arte",
  "travel": "Viagem", "young adult fiction": "Jovem Adulto", "young adult": "Jovem Adulto",
  "juvenile fiction": "Infantojuvenil", "juvenile nonfiction": "Infantojuvenil",
  "juvenile": "Infantojuvenil", "children": "Infantil", "children's books": "Infantil",
  "body, mind & spirit": "Espiritualidade", "spirituality": "Espiritualidade",
  "literary criticism": "Crítica Literária", "social science": "Ciências Sociais",
  "sociology": "Sociologia", "anthropology": "Antropologia", "cooking": "Culinária",
  "mathematics": "Matemática", "medical": "Medicina", "music": "Música", "law": "Direito",
  "drama": "Drama", "humor": "Humor", "romance": "Romance", "thriller": "Suspense",
  "thrillers": "Suspense", "mystery": "Mistério", "horror": "Terror", "adventure": "Aventura",
  "essays": "Ensaios", "reference": "Referência", "language arts & disciplines": "Linguagem",
  "epic": "Épico", "epic literature": "Épico", "short stories": "Contos",
  "novel": "Romance", "novels": "Romance",
};
const STOP = new Set(["general","books","subjects","topic","books and reading","reading","miscellaneous"]);

function toTitleCase(s: string) {
  return s.toLowerCase().split(/\s+/).map(w => w.length ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
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
    const parts = item.split(/[/>]|--|,/).map(p => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    for (const p of parts) {
      const lower = p.toLowerCase();
      if (STOP.has(lower)) continue;
      const translated = translateGenre(p);
      if (translated.length < 2) continue;
      out.add(translated);
    }
  }
  return Array.from(out);
}

function slugifyGenre(nome: string): string {
  return nome.toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function persistGenresForObra(
  supabase: ReturnType<typeof createClient>,
  obraId: string,
  rawGenres: unknown,
): Promise<{ nomes: string[]; ids: string[] }> {
  const nomes = normalizeGenres(rawGenres);
  if (!nomes.length || !obraId) return { nomes: [], ids: [] };

  const ids: string[] = [];
  for (const nome of nomes) {
    const slug = slugifyGenre(nome);
    if (!slug) continue;
    const { data: existing } = await supabase.from("generos").select("id").eq("slug", slug).maybeSingle();
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
    await supabase.from("obra_generos").upsert(
      ids.map(genero_id => ({ obra_id: obraId, genero_id })),
      { onConflict: "obra_id,genero_id", ignoreDuplicates: true } as any,
    );
  }
  return { nomes, ids };
}

// ── Tipos ──

type Fonte = "google_books" | "open_library" | "nenhuma";

type EnrichData = {
  fonte: Fonte;
  externalId: string | null;
  generos: string[];
  sinopse: string | null;
  capaObra: string | null;
  ano: number | null;
  idioma: string | null;
  editora: string | null;
  numPaginas: number | null;
  capaEdicao: string | null;
};

type LogItem = {
  obra_id: string;
  titulo: string;
  fonte: Fonte;
  resultado: "sucesso" | "parcial" | "nao_encontrado" | "erro";
  generos?: string[];
  campos_atualizados?: string[];
  erro?: string;
};

function parseYear(v: any): number | null {
  if (!v) return null;
  const m = String(v).match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

// ── APIs externas ──

async function fetchGoogleByIsbn(isbn: string): Promise<EnrichData | null> {
  const key = Deno.env.get("GOOGLE_BOOKS_API_KEY");
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}${keyParam}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) return null;
    const info = item.volumeInfo || {};
    const img = info.imageLinks?.thumbnail?.replace(/^http:/, "https:")
      ?? info.imageLinks?.smallThumbnail?.replace(/^http:/, "https:") ?? null;
    return {
      fonte: "google_books", externalId: item.id as string,
      generos: normalizeGenres(info.categories),
      sinopse: info.description ?? null, capaObra: img, capaEdicao: img,
      ano: parseYear(info.publishedDate), idioma: info.language ?? null,
      editora: info.publisher ?? null, numPaginas: info.pageCount ?? null,
    };
  } catch { return null; }
}

async function fetchOpenLibraryByIsbn(isbn: string): Promise<EnrichData | null> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;

    let subjects: string[] = Array.isArray(data.subjects) ? data.subjects : [];
    const workKey = data.works?.[0]?.key as string | undefined;
    if (workKey && subjects.length === 0) {
      try {
        const w = await fetch(`https://openlibrary.org${workKey}.json`);
        if (w.ok) {
          const wd = await w.json();
          if (Array.isArray(wd?.subjects)) subjects = wd.subjects;
        }
      } catch { /* ignora erro ao buscar obra OL */ }
    }

    const capaIsbn = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    return {
      fonte: "open_library", externalId: (data.key as string) ?? isbn,
      generos: normalizeGenres(subjects),
      sinopse: typeof data.description === "string"
        ? data.description : data.description?.value ?? null,
      capaObra: capaIsbn, capaEdicao: capaIsbn,
      ano: parseYear(data.publish_date), idioma: null,
      editora: data.publishers?.[0] ?? null, numPaginas: data.number_of_pages ?? null,
    };
  } catch { return null; }
}

// ── Enriquecimento ──

async function enriquecerObra(
  supabase: ReturnType<typeof createClient>,
  obra: { id: string; sinopse_padrao: string | null; capa_padrao_url: string | null; ano_primeira_publicacao: number | null },
  edicao: { id: string; editora: string | null; num_paginas: number | null; capa_url: string | null } | null,
  d: EnrichData,
): Promise<string[]> {
  const campos: string[] = [];

  const obraUpdate: Record<string, any> = {
    metadata_checked_at: new Date().toISOString(),
    metadata_source: d.fonte,
  };
  if (!obra.sinopse_padrao && d.sinopse) { obraUpdate.sinopse_padrao = d.sinopse; campos.push("sinopse"); }
  if (!obra.capa_padrao_url && d.capaObra) { obraUpdate.capa_padrao_url = d.capaObra; campos.push("capa_obra"); }
  if (!obra.ano_primeira_publicacao && d.ano) { obraUpdate.ano_primeira_publicacao = d.ano; campos.push("ano"); }
  await supabase.from("obras").update(obraUpdate).eq("id", obra.id);

  if (edicao) {
    const edicaoUpdate: Record<string, any> = {};
    const editoraVazia = !edicao.editora || edicao.editora === "Não informada" || edicao.editora.trim() === "";
    if (editoraVazia && d.editora) { edicaoUpdate.editora = d.editora; campos.push("editora"); }
    if (!edicao.num_paginas && d.numPaginas) { edicaoUpdate.num_paginas = d.numPaginas; campos.push("num_paginas"); }
    if (!edicao.capa_url && d.capaEdicao) { edicaoUpdate.capa_url = d.capaEdicao; campos.push("capa_edicao"); }
    if (Object.keys(edicaoUpdate).length) {
      edicaoUpdate.atualizado_em = new Date().toISOString();
      await supabase.from("edicoes").update(edicaoUpdate).eq("id", edicao.id);
    }
  }
  return campos;
}

// ── Handler principal ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* GET sem body */ }

    const mode = String(body?.mode ?? "test10");
    const limit = mode === "test10" ? 10 : mode === "batch50" ? 50 : 1000;
    const forcarSemGenero = body?.apenas_sem_genero !== false;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: candidatas, error: errCand } = await supabase
      .from("obras")
      .select(`id, titulo_original, sinopse_padrao, capa_padrao_url, ano_primeira_publicacao,
         edicoes(id, isbn_13, editora, num_paginas, capa_url)`)
      .limit(2000);

    if (errCand) return json({ error: errCand.message }, 500);

    const { data: comGenero } = await supabase.from("obra_generos").select("obra_id");
    const setComGenero = new Set((comGenero ?? []).map((r: any) => r.obra_id));

    const candidatasFiltradas = (candidatas ?? []).filter((o: any) =>
      forcarSemGenero ? !setComGenero.has(o.id) : true,
    );

    const fila = candidatasFiltradas.map((o: any) => {
      const edicoes: any[] = o.edicoes ?? [];
      const edicaoComIsbn = edicoes.find(
        (e: any) => e.isbn_13 && /^\d{13}$/.test(String(e.isbn_13).replace(/[-\s]/g, "")),
      );
      const isbn = edicaoComIsbn ? String(edicaoComIsbn.isbn_13).replace(/[-\s]/g, "") : null;
      const edicaoAlvo = edicaoComIsbn ?? edicoes[0] ?? null;
      return {
        id: o.id, titulo: o.titulo_original,
        sinopse_padrao: o.sinopse_padrao, capa_padrao_url: o.capa_padrao_url,
        ano_primeira_publicacao: o.ano_primeira_publicacao,
        isbn, edicaoAlvo,
      };
    })
    .sort((a, b) => (a.isbn ? -1 : 1) - (b.isbn ? -1 : 1))
    .slice(0, limit);

    const logs: LogItem[] = [];
    let sucesso = 0, parcial = 0, semRetorno = 0;

    for (const obra of fila) {
      try {
        let enriched: EnrichData | null = null;

        if (obra.isbn) {
          const gb = await fetchGoogleByIsbn(obra.isbn);
          const ol = await fetchOpenLibraryByIsbn(obra.isbn);
          if (gb && ol) {
            enriched = {
              ...gb,
              generos: gb.generos.length ? gb.generos : ol.generos,
              sinopse: gb.sinopse ?? ol.sinopse,
              capaObra: gb.capaObra ?? ol.capaObra,
              capaEdicao: gb.capaEdicao ?? ol.capaEdicao,
              ano: gb.ano ?? ol.ano,
              editora: gb.editora ?? ol.editora,
              numPaginas: gb.numPaginas ?? ol.numPaginas,
            };
          } else {
            enriched = gb ?? ol;
          }
        }

        if (!enriched) {
          semRetorno++;
          logs.push({ obra_id: obra.id, titulo: obra.titulo, fonte: "nenhuma", resultado: "nao_encontrado" });
          await supabase.from("obras").update({
            metadata_checked_at: new Date().toISOString(),
            metadata_source: null,
          }).eq("id", obra.id);
          continue;
        }

        // 1. Gêneros
        const { nomes: generosNomes } = await persistGenresForObra(supabase, obra.id, enriched.generos);

        // 2. Enriquece obra + edição
        const camposAtualizados = await enriquecerObra(supabase, obra, obra.edicaoAlvo, enriched);
        if (generosNomes.length) camposAtualizados.unshift("generos");

        // 3. Registra fonte externa (sem .catch() — usa try/catch)
        if (enriched.externalId && obra.edicaoAlvo?.id) {
          try {
            await supabase.from("edicoes_fontes_externas").upsert(
              {
                edicao_id: obra.edicaoAlvo.id,
                fonte: enriched.fonte,
                identificador_externo: enriched.externalId,
                data_sincronizacao: new Date().toISOString(),
              },
              { onConflict: "edicao_id,fonte,identificador_externo", ignoreDuplicates: true } as any,
            );
          } catch (_efErr) {
            // tabela edicoes_fontes_externas pode não existir — não travar
          }
        }

        const resultado: LogItem["resultado"] = generosNomes.length > 0 ? "sucesso" : "parcial";
        if (resultado === "sucesso") sucesso++; else parcial++;

        logs.push({
          obra_id: obra.id, titulo: obra.titulo, fonte: enriched.fonte,
          resultado, generos: generosNomes, campos_atualizados: camposAtualizados,
        });
      } catch (e: any) {
        logs.push({
          obra_id: obra.id, titulo: obra.titulo, fonte: "nenhuma",
          resultado: "erro", erro: e?.message ?? "erro desconhecido",
        });
      }
    }

    return json({
      processadas: fila.length, sucesso, parcial, sem_retorno: semRetorno,
      fonte: "google_books+open_library",
      executado_em: new Date().toISOString(),
      logs,
    });
  } catch (err: any) {
    return json({ error: err?.message ?? "internal" }, 500);
  }
});
