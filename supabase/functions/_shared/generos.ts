// Helpers compartilhados para extração, normalização, tradução e persistência
// de gêneros literários vindos de APIs externas (Google Books / Open Library).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

const TRANSLATIONS: Record<string, string> = {
  "business & economics": "Negócios",
  "business": "Negócios",
  "economics": "Economia",
  "self-help": "Autoajuda",
  "philosophy": "Filosofia",
  "history": "História",
  "religion": "Religião",
  "psychology": "Psicologia",
  "science": "Ciência",
  "fantasy": "Fantasia",
  "science fiction": "Ficção Científica",
  "sci-fi": "Ficção Científica",
  "fiction": "Ficção",
  "non-fiction": "Não Ficção",
  "nonfiction": "Não Ficção",
  "biography & autobiography": "Biografia",
  "biography": "Biografia",
  "autobiography": "Biografia",
  "comics & graphic novels": "Quadrinhos",
  "comics": "Quadrinhos",
  "graphic novels": "Quadrinhos",
  "literary collections": "Literatura",
  "literature": "Literatura",
  "poetry": "Poesia",
  "political science": "Política",
  "politics": "Política",
  "education": "Educação",
  "health & fitness": "Saúde",
  "health": "Saúde",
  "fitness": "Saúde",
  "computers": "Tecnologia",
  "technology": "Tecnologia",
  "art": "Arte",
  "arts": "Arte",
  "travel": "Viagem",
  "young adult fiction": "Jovem Adulto",
  "young adult": "Jovem Adulto",
  "juvenile fiction": "Infantojuvenil",
  "juvenile nonfiction": "Infantojuvenil",
  "juvenile": "Infantojuvenil",
  "children": "Infantil",
  "children's books": "Infantil",
  "body, mind & spirit": "Espiritualidade",
  "spirituality": "Espiritualidade",
  "literary criticism": "Crítica Literária",
  "social science": "Ciências Sociais",
  "sociology": "Sociologia",
  "anthropology": "Antropologia",
  "cooking": "Culinária",
  "mathematics": "Matemática",
  "medical": "Medicina",
  "music": "Música",
  "law": "Direito",
  "drama": "Drama",
  "humor": "Humor",
  "romance": "Romance",
  "thriller": "Suspense",
  "thrillers": "Suspense",
  "mystery": "Mistério",
  "horror": "Terror",
  "adventure": "Aventura",
  "essays": "Ensaios",
  "reference": "Referência",
  "language arts & disciplines": "Linguagem",
  "epic": "Épico",
  "epic literature": "Épico",
  "short stories": "Contos",
  "novel": "Romance",
  "novels": "Romance",
};

const STOP = new Set([
  "general",
  "books",
  "subjects",
  "topic",
  "books and reading",
  "reading",
  "miscellaneous",
]);

function toTitleCase(s: string) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function translateGenre(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (TRANSLATIONS[key]) return TRANSLATIONS[key];
  // tenta sem acentos / pluraliza
  const noPunct = key.replace(/[.,;:!?"]/g, "").trim();
  if (TRANSLATIONS[noPunct]) return TRANSLATIONS[noPunct];
  return toTitleCase(raw.trim());
}

/**
 * Extrai, normaliza e traduz gêneros vindos das APIs externas.
 * Aceita entradas como:
 *  - ["Fiction / Fantasy / Epic", "Self-Help"]
 *  - ["Business & Economics"]
 *  - ["fiction", "fantasy"]
 */
export function normalizeGenres(input: unknown): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  const out = new Set<string>();
  for (const item of arr) {
    if (typeof item !== "string") continue;
    // separa por "/", ">", "--", ","
    const parts = item
      .split(/[/>]|--|,/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
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

export function slugifyGenre(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Garante existência de cada gênero em `generos` e vincula-os à obra em
 * `obra_generos`. Não remove vínculos pré-existentes (idempotente / aditivo).
 */
export async function persistGenresForObra(
  supabase: SupabaseClient,
  obraId: string,
  rawGenres: unknown,
): Promise<{ nomes: string[]; ids: string[] }> {
  const nomes = normalizeGenres(rawGenres);
  if (!nomes.length || !obraId) return { nomes: [], ids: [] };

  const ids: string[] = [];
  for (const nome of nomes) {
    const slug = slugifyGenre(nome);
    if (!slug) continue;
    const { data: existing } = await supabase
      .from("generos")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    let generoId: string | null = existing?.id ?? null;
    if (!generoId) {
      const { data: inserted, error } = await supabase
        .from("generos")
        .insert({ nome, slug })
        .select("id")
        .single();
      if (error) {
        // corrida: outro processo criou — tenta reler
        const { data: again } = await supabase
          .from("generos")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        generoId = again?.id ?? null;
      } else {
        generoId = inserted.id;
      }
    }
    if (generoId) ids.push(generoId);
  }

  if (ids.length) {
    await supabase
      .from("obra_generos")
      .upsert(
        ids.map((genero_id) => ({ obra_id: obraId, genero_id })),
        { onConflict: "obra_id,genero_id", ignoreDuplicates: true },
      );
  }

  return { nomes, ids };
}
