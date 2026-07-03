// Edge function: reprocessar-obras v1
// Conciliação Wikidata para obras:
//   - Busca obras sem metadata_score (nunca tentadas)
//   - Para cada obra, busca candidatos no Wikidata
//   - Salva em obras_candidatos_wikidata
//   - Auto-concilia se score >= 80 (atualiza obra com dados Wikidata)

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

// ── Tipos ──────────────────────────────────────────────────────────────────

type WikiCandidato = {
  qid: string;
  url_wikidata: string;
  titulo: string;
  descricao: string | null;
  ano_publicacao: number | null;
  idioma_original: string | null;
  instance_of: string[];
  autor_qids: string[];
  autor_labels: string[];
  dados_externos: Record<string, unknown>;
};

type ResultadoObra = {
  obra_id: string;
  titulo: string;
  resultado: "auto_conciliado" | "candidatos" | "nao_encontrado" | "erro";
  score?: number;
  qid?: string;
  num_candidatos?: number;
  erro?: string;
};

// ── Utilitários de string ─────────────────────────────────────────────────

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard de tokens — retorna 0-1 */
function jaccardSim(a: string, b: string): number {
  const ta = new Set(normalizeStr(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeStr(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter(w => tb.has(w)).length;
  const union = new Set([...ta, ...tb]).size;
  return inter / union;
}

/** Retorna 0-1; penaliza subsets pequenos */
function titleSim(query: string, candidate: string): number {
  const q = normalizeStr(query);
  const c = normalizeStr(candidate);
  if (q === c) return 1;
  if (c.startsWith(q) || q.startsWith(c)) return 0.9;
  return jaccardSim(q, c);
}

// ── Wikidata API ──────────────────────────────────────────────────────────

const WD_API = "https://www.wikidata.org/w/api.php";

/** Busca candidatos por título. Retorna até maxResults QIDs. */
async function searchWikidata(
  titulo: string,
  lang = "pt",
  maxResults = 5,
): Promise<{ qid: string; label: string; description: string | null }[]> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: titulo,
    language: lang,
    uselang: lang,
    type: "item",
    limit: String(maxResults),
    format: "json",
    origin: "*",
  });
  try {
    const res = await fetch(`${WD_API}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.search ?? []).map((r: any) => ({
      qid: r.id,
      label: r.label ?? "",
      description: r.description ?? null,
    }));
  } catch { return []; }
}

/** Recupera detalhes de múltiplos QIDs. */
async function getEntities(
  qids: string[],
  langs = "pt|en",
): Promise<Record<string, any>> {
  if (!qids.length) return {};
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qids.join("|"),
    props: "labels|descriptions|claims",
    languages: langs,
    format: "json",
    origin: "*",
  });
  try {
    const res = await fetch(`${WD_API}?${params}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.entities ?? {};
  } catch { return {}; }
}

/** Extrai label pt > en > qualquer */
function getLabel(entity: any, langs = ["pt", "en"]): string {
  for (const l of langs) {
    if (entity.labels?.[l]?.value) return entity.labels[l].value;
  }
  const first = Object.values(entity.labels ?? {})[0] as any;
  return first?.value ?? "";
}

function getDescription(entity: any, langs = ["pt", "en"]): string | null {
  for (const l of langs) {
    if (entity.descriptions?.[l]?.value) return entity.descriptions[l].value;
  }
  return null;
}

/** Extrai valores de uma claim P-property */
function claimValues(entity: any, prop: string): string[] {
  const stmts = entity.claims?.[prop] ?? [];
  return stmts
    .map((s: any) => s.mainsnak?.datavalue?.value)
    .filter(Boolean);
}

/** Extrai QIDs de uma claim (ex: P31, P50) */
function claimQIDs(entity: any, prop: string): string[] {
  return claimValues(entity, prop)
    .filter((v: any) => typeof v === "object" && v["entity-type"] === "item")
    .map((v: any) => v.id);
}

/** Extrai ano de P577 (publication date) */
function claimYear(entity: any): number | null {
  const vals = claimValues(entity, "P577");
  for (const v of vals) {
    if (typeof v === "object" && v.time) {
      const m = String(v.time).match(/(\d{4})/);
      if (m) return parseInt(m[1]);
    }
  }
  return null;
}

/** Extrai código de idioma de P407 */
function claimIdioma(entity: any): string | null {
  const qids = claimQIDs(entity, "P407");
  // Mapeamento básico QID → código
  const MAP: Record<string, string> = {
    Q5146: "pt", Q1860: "en", Q150: "fr", Q188: "de",
    Q652: "it", Q1321: "es", Q7737: "ru", Q5885: "ja",
  };
  return qids.map(q => MAP[q]).find(Boolean) ?? null;
}

// Classes Wikidata reconhecidas como obra literária/livro
const BOOK_CLASSES = new Set([
  "Q571",       // book
  "Q7725634",   // literary work
  "Q47461344",  // written work
  "Q17537576",  // creative work
  "Q8261",      // novel
  "Q49084",     // short story
  "Q5185279",   // poem
  "Q45",        // romance
  "Q5",         // human — não é livro, mas alguns são indexados assim
]);

// ── Scoring ───────────────────────────────────────────────────────────────

type ObraInfo = {
  titulo: string;
  ano: number | null;
  autorNomes: string[];
};

function scorarCandidato(
  obra: ObraInfo,
  candidato: WikiCandidato,
): number {
  let score = 0;

  // 1. Similaridade de título: até 55 pontos
  const ts = titleSim(obra.titulo, candidato.titulo);
  score += Math.round(ts * 55);

  // 2. Instância de obra/livro: até 20 pontos
  const isBook = candidato.instance_of.some(id => BOOK_CLASSES.has(id));
  if (isBook) score += 20;

  // 3. Correspondência de ano: até 10 pontos
  if (obra.ano && candidato.ano_publicacao) {
    const diff = Math.abs(obra.ano - candidato.ano_publicacao);
    if (diff === 0) score += 10;
    else if (diff <= 2) score += 5;
    else if (diff <= 5) score += 2;
  }

  // 4. Correspondência de autor: até 15 pontos
  if (obra.autorNomes.length && candidato.autor_labels.length) {
    const autorMatch = obra.autorNomes.some(n =>
      candidato.autor_labels.some(ca => jaccardSim(n, ca) >= 0.5),
    );
    if (autorMatch) score += 15;
  }

  return Math.min(Math.max(score, 0), 100);
}

// ── Processamento por obra ────────────────────────────────────────────────

async function processarObra(
  supabase: ReturnType<typeof createClient>,
  obra: {
    id: string;
    titulo_original: string;
    ano_primeira_publicacao: number | null;
    sinopse_padrao: string | null;
    idioma_original: string;
    autorNomes: string[];
  },
): Promise<ResultadoObra> {
  const obraInfo: ObraInfo = {
    titulo: obra.titulo_original,
    ano: obra.ano_primeira_publicacao,
    autorNomes: obra.autorNomes,
  };

  // 1. Busca no Wikidata (pt, depois en se poucos resultados)
  let searchResults = await searchWikidata(obra.titulo_original, "pt", 5);
  if (searchResults.length < 2) {
    const enResults = await searchWikidata(obra.titulo_original, "en", 5);
    const qidsSeen = new Set(searchResults.map(r => r.qid));
    searchResults = [
      ...searchResults,
      ...enResults.filter(r => !qidsSeen.has(r.qid)),
    ].slice(0, 7);
  }

  if (!searchResults.length) {
    await supabase.from("obras").update({
      metadata_score: 0,
      metadata_checked_at: new Date().toISOString(),
    }).eq("id", obra.id);
    return { obra_id: obra.id, titulo: obra.titulo_original, resultado: "nao_encontrado", score: 0 };
  }

  // 2. Recupera detalhes dos candidatos
  const qids = searchResults.map(r => r.qid);
  const entities = await getEntities(qids);

  const candidatos: (WikiCandidato & { score: number })[] = [];

  for (const sr of searchResults) {
    const entity = entities[sr.qid];
    if (!entity || entity.missing !== undefined) continue;

    const instanceOf = claimQIDs(entity, "P31");
    const autorQids = claimQIDs(entity, "P50");
    const ano = claimYear(entity);
    const idioma = claimIdioma(entity);
    const titulo = getLabel(entity) || sr.label;
    const descricao = getDescription(entity) || sr.description;

    // Recupera labels dos autores para scoring
    let autorLabels: string[] = [];
    if (autorQids.length) {
      const autorEntities = await getEntities(autorQids.slice(0, 3));
      autorLabels = Object.values(autorEntities)
        .map((e: any) => getLabel(e))
        .filter(Boolean);
    }

    const candidato: WikiCandidato = {
      qid: sr.qid,
      url_wikidata: `https://www.wikidata.org/wiki/${sr.qid}`,
      titulo,
      descricao,
      ano_publicacao: ano,
      idioma_original: idioma,
      instance_of: instanceOf,
      autor_qids: autorQids,
      autor_labels: autorLabels,
      dados_externos: { entity, search_result: sr },
    };

    const score = scorarCandidato(obraInfo, candidato);
    candidatos.push({ ...candidato, score });
  }

  if (!candidatos.length) {
    await supabase.from("obras").update({
      metadata_score: 0,
      metadata_checked_at: new Date().toISOString(),
    }).eq("id", obra.id);
    return { obra_id: obra.id, titulo: obra.titulo_original, resultado: "nao_encontrado", score: 0 };
  }

  // Ordena por score desc
  candidatos.sort((a, b) => b.score - a.score);
  const melhor = candidatos[0];

  // 3. Salva candidatos (upsert)
  for (const c of candidatos.slice(0, 5)) {
    try {
      await supabase.from("obras_candidatos_wikidata").upsert(
        {
          obra_id: obra.id,
          qid: c.qid,
          url_wikidata: c.url_wikidata,
          titulo: c.titulo,
          descricao: c.descricao,
          ano_publicacao: c.ano_publicacao,
          idioma_original: c.idioma_original,
          score_namzu: c.score,
          dados_externos: c.dados_externos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "obra_id,qid" },
      );
    } catch { /* ignora erro de upsert individual */ }
  }

  // 4. Auto-concilia se score >= 80
  const AUTO_THRESHOLD = 80;
  if (melhor.score >= AUTO_THRESHOLD) {
    const obraUpdate: Record<string, any> = {
      metadata_score: melhor.score,
      metadata_source: "wikidata",
      metadata_checked_at: new Date().toISOString(),
    };
    // Enriquece campos vazios
    if (!obra.sinopse_padrao && melhor.descricao) {
      obraUpdate.sinopse_padrao = melhor.descricao;
    }
    if (!obra.ano_primeira_publicacao && melhor.ano_publicacao) {
      obraUpdate.ano_primeira_publicacao = melhor.ano_publicacao;
    }
    // Idioma: só sobrescreve se ainda no default 'pt-BR' e Wikidata tem outro
    if (obra.idioma_original === "pt-BR" && melhor.idioma_original &&
        melhor.idioma_original !== "pt") {
      obraUpdate.idioma_original = melhor.idioma_original;
    }
    await supabase.from("obras").update(obraUpdate).eq("id", obra.id);

    return {
      obra_id: obra.id,
      titulo: obra.titulo_original,
      resultado: "auto_conciliado",
      score: melhor.score,
      qid: melhor.qid,
    };
  }

  // 5. Candidatos para revisão manual
  await supabase.from("obras").update({
    metadata_score: melhor.score,
    metadata_checked_at: new Date().toISOString(),
  }).eq("id", obra.id);

  return {
    obra_id: obra.id,
    titulo: obra.titulo_original,
    resultado: "candidatos",
    score: melhor.score,
    num_candidatos: candidatos.length,
  };
}

// ── Handler principal ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* GET */ }

    const mode = String(body?.mode ?? "test5");
    const limit = mode === "test5" ? 5 : mode === "test10" ? 10 : mode === "batch50" ? 50 : 200;
    const autoThreshold = Number(body?.threshold ?? 80);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca obras ainda não tentadas (metadata_score IS NULL)
    const { data: obras, error: errObras } = await supabase
      .from("obras")
      .select(`
        id, titulo_original, ano_primeira_publicacao,
        sinopse_padrao, idioma_original,
        obra_autores(autores(nome_completo))
      `)
      .is("metadata_score", null)
      .limit(limit);

    if (errObras) return json({ error: errObras.message }, 500);

    const fila = (obras ?? []).map((o: any) => ({
      ...o,
      autorNomes: (o.obra_autores ?? [])
        .map((oa: any) => oa.autores?.nome_completo)
        .filter(Boolean),
    }));

    const logs: ResultadoObra[] = [];
    let auto = 0, candidatos = 0, naoEncontrado = 0;

    for (const obra of fila) {
      try {
        const resultado = await processarObra(supabase, obra);
        logs.push(resultado);
        if (resultado.resultado === "auto_conciliado") auto++;
        else if (resultado.resultado === "candidatos") candidatos++;
        else naoEncontrado++;
      } catch (e: any) {
        logs.push({
          obra_id: obra.id,
          titulo: obra.titulo_original,
          resultado: "erro",
          erro: e?.message ?? "erro desconhecido",
        });
      }
      // Rate limit Wikidata: pausa 300ms entre obras
      await new Promise(r => setTimeout(r, 300));
    }

    return json({
      processadas: fila.length,
      auto_conciliadas: auto,
      com_candidatos: candidatos,
      nao_encontradas: naoEncontrado,
      threshold_auto: autoThreshold,
      executado_em: new Date().toISOString(),
      logs,
    });
  } catch (err: any) {
    return json({ error: err?.message ?? "internal" }, 500);
  }
});
