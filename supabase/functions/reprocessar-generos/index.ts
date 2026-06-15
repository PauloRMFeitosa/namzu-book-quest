// Edge function: reprocessar-generos
// Reprocessa obras sem gêneros usando Google Books e Open Library.
// Registra execução em integracoes_execucoes / integracoes_execucoes_itens
// (mesmo padrão do reprocessar-autores).

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verificação de autenticação admin
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Token inválido" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode ?? "test10");
    const limit = mode === "test10" ? 10 : mode === "batch50" ? 50 : 1000;

    // Busca obras sem gêneros, priorizando com ISBN13
    const { data: candidatas, error: errCand } = await admin
      .from("obras")
      .select("id, titulo_original, edicoes(isbn_13)")
      .limit(2000);

    if (errCand) return json({ error: errCand.message }, 500);

    const { data: comGenero } = await admin
      .from("obra_generos")
      .select("obra_id");
    const setComGenero = new Set((comGenero ?? []).map((r: any) => r.obra_id));

    const semGenero = (candidatas ?? []).filter((o: any) => !setComGenero.has(o.id));

    const withIsbn = semGenero
      .map((o: any) => {
        const isbn = (o.edicoes ?? [])
          .map((e: any) => e.isbn_13)
          .find((x: string | null) => !!x && /^\d{13}$/.test(String(x).replace(/[-\s]/g, "")));
        return { id: o.id, titulo: o.titulo_original, isbn: isbn ? String(isbn).replace(/[-\s]/g, "") : null };
      })
      .sort((a, b) => (a.isbn ? -1 : 1) - (b.isbn ? -1 : 1))
      .slice(0, limit);

    // Cria registro de execução
    const { data: execRow, error: execErr } = await admin
      .from("integracoes_execucoes")
      .insert({
        tipo_processo: "reprocessamento_generos",
        fonte: "google_books+open_library",
        status: "em_andamento",
        quantidade_solicitada: withIsbn.length,
      } as any)
      .select("id")
      .single();
    if (execErr || !execRow) return json({ error: execErr?.message ?? "Falha ao criar execução" }, 500);
    const execucaoId = execRow.id;

    const logs: LogItem[] = [];
    let sucesso = 0;
    let semRetorno = 0;
    let erros = 0;

    for (const obra of withIsbn) {
      let resultado: "sucesso" | "nao_encontrado" | "erro" = "nao_encontrado";
      let fonte: LogItem["fonte"] = "nenhuma";
      let generos: string[] = [];
      let externalId: string | null = null;
      let mensagem: string | null = null;

      try {
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
          await persistGenresForObra(admin as any, obra.id, generos);
          sucesso++;
          resultado = "sucesso";
          mensagem = `${generos.length} gênero(s) via ${fonte}`;
          logs.push({ obra_id: obra.id, titulo: obra.titulo, fonte, resultado: "sucesso", generos });
        } else {
          semRetorno++;
          resultado = "nao_encontrado";
          mensagem = obra.isbn ? "ISBN encontrado mas sem gêneros" : "Sem ISBN13";
          logs.push({ obra_id: obra.id, titulo: obra.titulo, fonte: "nenhuma", resultado: "nao_encontrado" });
        }

        // Registra fonte externa em edição
        if (externalId && obra.isbn && fonte !== "nenhuma") {
          const { data: edicao } = await admin
            .from("edicoes")
            .select("id")
            .eq("obra_id", obra.id)
            .eq("isbn_13", obra.isbn)
            .maybeSingle();
          if (edicao?.id) {
            await admin
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

        // Atualiza metadata da obra
        await admin
          .from("obras")
          .update({
            metadata_checked_at: new Date().toISOString(),
            metadata_source: fonte === "nenhuma" ? null : fonte,
          })
          .eq("id", obra.id);
      } catch (e: any) {
        erros++;
        resultado = "erro";
        mensagem = e?.message ?? "erro";
        logs.push({ obra_id: obra.id, titulo: obra.titulo, fonte: "nenhuma", resultado: "erro", erro: mensagem ?? undefined });
      }

      // Persiste item individual na execução
      await admin.from("integracoes_execucoes_itens").insert({
        execucao_id: execucaoId,
        entidade_id: obra.id,
        tipo_entidade: "obra",
        nome_referencia: obra.titulo,
        status: resultado,
        mensagem,
        dados_resposta: generos.length ? { generos, fonte } : null,
      } as any);
    }

    const processadas = sucesso + semRetorno + erros;
    const statusFinal = erros === 0
      ? "concluido"
      : erros < processadas
        ? "concluido_com_erros"
        : "erro";

    await admin
      .from("integracoes_execucoes")
      .update({
        status: statusFinal,
        finalizado_em: new Date().toISOString(),
        quantidade_processada: processadas,
        quantidade_sucesso: sucesso,
        quantidade_erro: erros,
      } as any)
      .eq("id", execucaoId);

    return json({
      execucao_id: execucaoId,
      processadas,
      sucesso,
      sem_retorno: semRetorno,
      erros,
      fonte: "google_books+open_library",
      executado_em: new Date().toISOString(),
      logs,
    });
  } catch (err: any) {
    console.error("reprocessar-generos error", err);
    return json({ error: err?.message ?? "internal" }, 500);
  }
});
