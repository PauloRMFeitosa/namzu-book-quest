// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chamarIA, ErroIA, lerConfiguracaoIA, type NivelDoModelo } from "../_shared/ia.ts";

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

// O provedor e os modelos ficam em _shared/ia.ts.
const MODELOS: Record<string, NivelDoModelo> = {
  "google/gemini-2.5-flash": "rapido",
  "google/gemini-2.5-pro": "avancado",
};

function callAI(opts: { model: string; system: string; user: string; json_schema?: any }) {
  return chamarIA(lerConfiguracaoIA(), {
    nivel: MODELOS[opts.model] ?? "rapido",
    system: opts.system,
    user: opts.user,
    json_schema: opts.json_schema,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const { acao, clube_id, post_id, payload } = await req.json();

    // ---------- 1. RECOMENDAÇÕES DE CLUBES ----------
    if (acao === "recomendacoes") {
      const [{ data: interesses }, { data: clubes }] = await Promise.all([
        supabase.from("perfil_interesses").select("interesses(nome, categoria)").eq("user_id", user.id),
        supabase.from("clubes").select("id, nome, descricao, objetivo").eq("is_ativo", true).limit(40),
      ]);
      const interessesTxt = (interesses ?? []).map((i: any) => i.interesses?.nome).filter(Boolean).join(", ") || "leitura geral";
      const clubesTxt = (clubes ?? []).map((c: any) => `- ${c.id} | ${c.nome} — ${c.descricao ?? ""} ${c.objetivo ? `(objetivo: ${c.objetivo})` : ""}`).join("\n");
      const result = await callAI({
        model: "google/gemini-2.5-flash",
        system: "Você é um curador editorial. Recomende clubes de leitura com base nos interesses do usuário. Responda em JSON.",
        user: `Interesses do usuário: ${interessesTxt}\n\nClubes disponíveis:\n${clubesTxt}\n\nEscolha até 4 clubes mais alinhados e justifique cada um em uma frase curta e provocativa.`,
        json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            recomendacoes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: { clube_id: { type: "string" }, motivo: { type: "string" } },
                required: ["clube_id", "motivo"],
              },
            },
          },
          required: ["recomendacoes"],
        },
      });
      return json(result);
    }

    // ---------- 2. RESUMO DE DISCUSSÃO ----------
    if (acao === "resumo_discussao") {
      if (!clube_id) return json({ error: "clube_id required" }, 400);
      const { data: posts } = await supabase
        .from("clube_posts")
        .select("conteudo, created_at")
        .eq("clube_id", clube_id)
        .order("created_at", { ascending: false })
        .limit(40);
      const txt = (posts ?? []).map((p: any) => `- ${p.conteudo}`).join("\n");
      const result = await callAI({
        model: "google/gemini-2.5-pro",
        system: "Você sintetiza discussões literárias com profundidade editorial.",
        user: `Resuma a discussão recente do clube em 3 partes: (1) Temas principais, (2) Tensões/divergências, (3) Perguntas que ficaram em aberto. Posts:\n\n${txt}`,
      });
      return json(result);
    }

    // ---------- 3. PERGUNTAS PROFUNDAS ----------
    if (acao === "perguntas_profundas") {
      let contexto = payload?.texto ?? "";
      if (post_id && !contexto) {
        const { data: p } = await supabase.from("clube_posts").select("conteudo").eq("id", post_id).maybeSingle();
        contexto = p?.conteudo ?? "";
      }
      if (!contexto) return json({ error: "sem contexto" }, 400);
      const result = await callAI({
        model: "google/gemini-2.5-flash",
        system: "Você é um filósofo socrático. Gere perguntas que provocam reflexão profunda, não respostas óbvias.",
        user: `A partir deste post/trecho, gere 3 perguntas profundas que possam destravar uma conversa rica:\n\n"${contexto}"`,
        json_schema: {
          type: "object",
          additionalProperties: false,
          properties: { perguntas: { type: "array", items: { type: "string" } } },
          required: ["perguntas"],
        },
      });
      return json(result);
    }

    // ---------- 4. MATCHMAKING ----------
    if (acao === "matchmaking") {
      if (!clube_id) return json({ error: "clube_id required" }, 400);
      const [{ data: meusInteresses }, { data: membros }] = await Promise.all([
        supabase.from("perfil_interesses").select("interesses(nome)").eq("user_id", user.id),
        supabase.from("clube_membros").select("user_id").eq("clube_id", clube_id).eq("status", "ativo").neq("user_id", user.id).limit(50),
      ]);
      const ids = (membros ?? []).map((m: any) => m.user_id);
      if (!ids.length) return json({ matches: [] });
      const [{ data: perfis }, { data: outrosInteresses }] = await Promise.all([
        supabase.from("perfis").select("user_id, nome_exibicao, username, bio").in("user_id", ids),
        supabase.from("perfil_interesses").select("user_id, interesses(nome)").in("user_id", ids),
      ]);
      const meus = (meusInteresses ?? []).map((i: any) => i.interesses?.nome).filter(Boolean);
      const mapInt = new Map<string, string[]>();
      (outrosInteresses ?? []).forEach((row: any) => {
        const arr = mapInt.get(row.user_id) ?? [];
        if (row.interesses?.nome) arr.push(row.interesses.nome);
        mapInt.set(row.user_id, arr);
      });
      const candidatos = (perfis ?? []).map((p: any) => ({
        user_id: p.user_id,
        nome: p.nome_exibicao || p.username,
        bio: p.bio ?? "",
        interesses: mapInt.get(p.user_id) ?? [],
      }));
      const result = await callAI({
        model: "google/gemini-2.5-flash",
        system: "Você sugere conexões intelectuais com base em afinidade real, não apenas sobreposição de tags.",
        user: `Meus interesses: ${meus.join(", ") || "—"}.\n\nCandidatos:\n${JSON.stringify(candidatos)}\n\nEscolha até 5 com maior afinidade intelectual e explique em uma frase por que vale conversar.`,
        json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  user_id: { type: "string" },
                  nome: { type: "string" },
                  motivo: { type: "string" },
                },
                required: ["user_id", "nome", "motivo"],
              },
            },
          },
          required: ["matches"],
        },
      });
      return json(result);
    }

    return json({ error: "acao desconhecida" }, 400);
  } catch (e: any) {
    if (e instanceof Response) return e;
    if (e instanceof ErroIA) return json({ error: e.codigo, message: e.message }, e.status);
    console.error(e);
    return json({ error: "internal", message: e?.message ?? String(e) }, 500);
  }
});
