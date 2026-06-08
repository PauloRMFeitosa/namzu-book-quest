// Helpers compartilhados para conciliação de autores via Wikidata.
// Reutilizado por reprocessar-autores e conciliar-autor.

export const PROFISSOES_AUTORIA = [
  "autor", "autora", "escritor", "escritora", "romancista", "poeta", "poetisa",
  "dramaturgo", "dramaturga", "filósofo", "filósofa", "ensaísta", "novelista",
  "jornalista", "historiador", "historiadora",
  "author", "writer", "novelist", "poet", "playwright", "philosopher",
  "essayist", "journalist", "historian",
];

export function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function sortKeyName(nome: string): string {
  // "Último Sobrenome, Nome" -> nome ordenacao
  const parts = (nome || "").trim().split(/\s+/);
  if (parts.length < 2) return nome || "";
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return `${last}, ${rest}`;
}

const UA = "NamzuBot/1.0 (https://namzu.com.br)";

export async function wbsearchentities(query: string, lang = "pt", limit = 8): Promise<Array<{ id: string; label?: string; description?: string; concepturi?: string }>> {
  if (!query?.trim()) return [];
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${lang}&format=json&type=item&limit=${limit}&uselang=${lang}&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": UA } }).catch(() => null);
  if (!res || !res.ok) return [];
  const data = await res.json().catch(() => null);
  return data?.search ?? [];
}

export async function wbgetentities(ids: string[]): Promise<Record<string, any>> {
  if (!ids.length) return {};
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(ids.join("|"))}&props=labels|descriptions|aliases|claims&languages=pt|en&format=json&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": UA } }).catch(() => null);
  if (!res || !res.ok) return {};
  const data = await res.json().catch(() => null);
  return data?.entities ?? {};
}

function extractClaimValues(entity: any, prop: string): any[] {
  const claims = entity?.claims?.[prop];
  if (!Array.isArray(claims)) return [];
  return claims
    .map((c: any) => c?.mainsnak?.datavalue?.value)
    .filter((v: any) => v !== undefined && v !== null);
}

function parseTimeClaim(v: any): string | null {
  // Wikidata time value: { time: "+1928-08-07T00:00:00Z", precision: 11, ... }
  if (!v?.time) return null;
  const m = /^([+-])(\d{1,4})-(\d{2})-(\d{2})/.exec(v.time);
  if (!m) return null;
  const sign = m[1] === "-" ? "-" : "";
  const year = m[2].padStart(4, "0");
  const month = m[3] === "00" ? "01" : m[3];
  const day = m[4] === "00" ? "01" : m[4];
  if (sign === "-") return null; // ignora datas BC
  return `${year}-${month}-${day}`;
}

export async function resolveLabels(qids: string[], lang = "pt"): Promise<Record<string, string>> {
  if (!qids.length) return {};
  const out: Record<string, string> = {};
  // chunks de 50
  for (let i = 0; i < qids.length; i += 50) {
    const chunk = qids.slice(i, i + 50);
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join("|")}&props=labels&languages=pt|en&format=json&origin=*`;
    const res = await fetch(url, { headers: { "User-Agent": UA } }).catch(() => null);
    if (!res || !res.ok) continue;
    const data = await res.json().catch(() => null);
    const ents = data?.entities ?? {};
    for (const qid of chunk) {
      const e = ents[qid];
      const label = e?.labels?.pt?.value ?? e?.labels?.en?.value ?? qid;
      out[qid] = label;
    }
  }
  return out;
}

export function commonsImageUrl(filename: string): string {
  // Gera URL pública do Commons baseado no nome do arquivo
  const fn = filename.replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fn)}`;
}

export type WikidataCandidato = {
  qid: string;
  url_wikidata: string;
  nome: string;
  descricao: string | null;
  aliases: string[];
  data_nascimento: string | null;
  data_falecimento: string | null;
  nacionalidade: string | null;
  foto_url: string | null;
  dados_externos: any;
};

export async function buildCandidato(qid: string, entity: any): Promise<WikidataCandidato> {
  const labels = entity?.labels ?? {};
  const descriptions = entity?.descriptions ?? {};
  const aliases = entity?.aliases ?? {};

  const nome = labels.pt?.value ?? labels.en?.value ?? qid;
  const descricao = descriptions.pt?.value ?? descriptions.en?.value ?? null;

  const aliasPt = (aliases.pt ?? []).map((a: any) => a.value);
  const aliasEn = (aliases.en ?? []).map((a: any) => a.value);
  const aliasesArr = Array.from(new Set([...aliasPt, ...aliasEn]));

  const dnVal = extractClaimValues(entity, "P569")[0];
  const dfVal = extractClaimValues(entity, "P570")[0];
  const data_nascimento = dnVal ? parseTimeClaim(dnVal) : null;
  const data_falecimento = dfVal ? parseTimeClaim(dfVal) : null;

  const natIds = extractClaimValues(entity, "P27").map((v: any) => v?.id).filter(Boolean);
  let nacionalidade: string | null = null;
  if (natIds.length) {
    const natLabels = await resolveLabels(natIds);
    nacionalidade = natIds.map((id: string) => natLabels[id]).filter(Boolean).join(", ") || null;
  }

  const imgVal = extractClaimValues(entity, "P18")[0];
  const foto_url = typeof imgVal === "string" ? commonsImageUrl(imgVal) : null;

  return {
    qid,
    url_wikidata: `https://www.wikidata.org/wiki/${qid}`,
    nome,
    descricao,
    aliases: aliasesArr,
    data_nascimento,
    data_falecimento,
    nacionalidade,
    foto_url,
    dados_externos: entity,
  };
}

export function scoreCandidato(autor: {
  nome_completo: string;
  nome_ordenacao?: string | null;
  nome_normalizado?: string | null;
  aliases?: any;
  descricao?: string | null;
}, cand: WikidataCandidato): number {
  let score = 0;
  const nomeA = (autor.nome_completo ?? "").trim().toLowerCase();
  const nomeC = (cand.nome ?? "").trim().toLowerCase();

  if (nomeA && nomeA === nomeC) score += 50;

  const normA = autor.nome_normalizado ?? normalizeText(autor.nome_completo);
  const normC = normalizeText(cand.nome);
  if (normA && normA === normC) score += 20;

  const ordA = (autor.nome_ordenacao ?? sortKeyName(autor.nome_completo)).toLowerCase();
  const ordC = sortKeyName(cand.nome).toLowerCase();
  if (ordA && ordA === ordC) score += 10;

  const existingAliases: string[] = Array.isArray(autor.aliases)
    ? (autor.aliases as any[]).map((a) => String(a).toLowerCase())
    : [];
  const candAliasesNorm = cand.aliases.map((a) => a.toLowerCase());
  if (existingAliases.some((a) => candAliasesNorm.includes(a))) score += 10;
  else if (candAliasesNorm.some((a) => normalizeText(a) === normA)) score += 5;

  const desc = (cand.descricao ?? "").toLowerCase();
  if (desc && PROFISSOES_AUTORIA.some((p) => desc.includes(p))) score += 10;

  return Math.min(100, score);
}
