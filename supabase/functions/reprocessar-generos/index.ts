// Edge function: reprocessar-generos
// Reprocessa obras sem gêneros usando Google Books e Open Library.
// Reutiliza persistGenresForObra do shared.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeGenres, persistGenresForObra } from "../_shared/generos.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type LogItem = {
  obra_id: string;
  titulo: string;
  fonte: "google_books" | "open_library" | "nenhuma";
  resultado: "sucesso" | "nao_encontrado" | "erro";
  generos?: string[];
  erro?: string;
};

async function fetchGoogleByIsbn(isbn: string) {
  const key = Deno.env.get("GOOGLE_BOOKS_API_KEY");
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}${keyParam}`;
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) return null;
  const data = await res.json().catch(() => null);
  const item = data?.items?.[0];
  if (!item) return null;
  const info = item.volumeInfo || {};
  return {
    externalId: item.id as string,
    categories: info.categories as string[] | undefined,
    raw: info,
  };
}

async function fetchOpenLibraryByIsbn(isbn: string) {
  const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`).catch(() => null);
  if (!res || !res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data) return null;
  // collect subjects from works if needed
  let subjects: string[] = Array.isArray(data.subjects) ? data.subjects : [];
  const workKey = data.works?.[0]?.key as string | undefined;
  if (workKey && subjects.length === 0) {
    const w = await fetch(`https://openlibrary.org${workKey}.json`).catch(() => null);
    if (w && w.ok) {
      const wd = await w.json().catch(() => null);
      if (Array.isArray(wd?.subjects)) subjects = wd.subjects;
    }
  }
  return {
    externalId: (data.key as string) ?? isbn,
    subjects,
    raw: data,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode ?? "test10");
    const limit = mode === "test10" ? 10 : mode === "batch50" ? 50 : 1000;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca obras sem gêneros, priorizando com ISBN13
    const { data: candidatas, error: errCand } = await supabase
      .from("obras")
      .select("id, titulo_original, edicoes(isbn_13)")
      .limit(2000);

    if (errCand) return json({ error: errCand.message }, 500);

    // Filtrar as que não têm gêneros
    const { data: comGenero } = await supabase
      .from("obra_generos")
      .select("obra_id");
    const setComGenero = new Set((comGenero ?? []).map((r: any) => r.obra_id));

    const semGenero = (candidatas ?? []).filter((o: any) => !setComGenero.has(o.id));

    // Priorizar com ISBN13
    const withIsbn = semGenero
      .map((o: any) => {
        const isbn = (o.edicoes ?? [])
          .map((e: any) => e.isbn_13)
          .find((x: string | null) => !!x && /^\d{13}$/.test(String(x).replace(/[-\s]/g, "")));
        return { id: o.id, titulo: o.titulo_original, isbn: isbn ? String(isbn).replace(/[-\s]/g, "") : null };
      })
      .sort((a, b) => (a.isbn ? -1 : 1) - (b.isbn ? -1 : 1))
      .slice(0, limit);

    const logs: LogItem[] = [];
    let sucesso = 0;
    let semRetorno = 0;

    for (const obra of withIsbn) {
      try {
        let fonte: LogItem["fonte"] = "nenhuma";
        let generos: string[] = [];
        let externalId: string | null = null;

        if (obra.isbn) {
          // 1. Google Books
          const g = await fetchGoogleByIsbn(obra.isbn);
          if (g) {
            const cats = normalizeGenres(g.categories);
            if (cats.length) {
              fonte = "google_books";
              generos = cats;
              externalId = g.externalId;
            } else if (g.externalId) {
              // registra fonte mesmo sem gêneros
              externalId = g.externalId;
            }
          }

          // 2. Open Library fallback
          if (!generos.length) {
            const ol = await fetchOpenLibraryByIsbn(obra.isbn);
            if (ol) {
              const subs = normalizeGenres(ol.subjects);
              if (subs.length) {
                fonte = "open_library";
                generos = subs;
                externalId = ol.externalId;
              }
            }
          }
        }

        if (generos.length) {
          await persistGenresForObra(supabase as any, obra.id, generos);
          sucesso++;
          logs.push({
            obra_id: obra.id,
            titulo: obra.titulo,
            fonte,
            resultado: "sucesso",
            generos,
          });
        } else {
          semRetorno++;
          logs.push({
            obra_id: obra.id,
            titulo: obra.titulo,
            fonte: "nenhuma",
            resultado: "nao_encontrado",
          });
        }

        // Registra fonte externa em edicao (primeira com ISBN)
        if (externalId && obra.isbn && fonte !== "nenhuma") {
          const { data: edicao } = await supabase
            .from("edicoes")
            .select("id")
            .eq("obra_id", obra.id)
            .eq("isbn_13", obra.isbn)
            .maybeSingle();
          if (edicao?.id) {
            await supabase
              .from("edicoes_fontes_externas")
              .upsert(
                {
                  edicao_id: edicao.id,
                  fonte,
                  identificador_externo: externalId,
                  data_sincronizacao: new Date().toISOString(),
                },
                { onConflict: "edicao_id,fonte,identificador_externo", ignoreDuplicates: true } as any,
              );
          }
        }

        // Atualiza metadata
        await supabase
          .from("obras")
          .update({
            metadata_checked_at: new Date().toISOString(),
            metadata_source: fonte === "nenhuma" ? null : fonte,
          })
          .eq("id", obra.id);
      } catch (e: any) {
        logs.push({
          obra_id: obra.id,
          titulo: obra.titulo,
          fonte: "nenhuma",
          resultado: "erro",
          erro: e?.message ?? "erro",
        });
      }
    }

    return json({
      processadas: withIsbn.length,
      sucesso,
      sem_retorno: semRetorno,
      fonte: "google_books+open_library",
      executado_em: new Date().toISOString(),
      logs,
    });
  } catch (err: any) {
    console.error("reprocessar-generos error", err);
    return json({ error: err?.message ?? "internal" }, 500);
  }
});
