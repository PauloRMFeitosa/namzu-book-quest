// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const { usuario_leitura_id, modo, pergunta } = await req.json();
    if (!usuario_leitura_id) return json({ error: "usuario_leitura_id required" }, 400);

    const { data: ul } = await supabase
      .from("usuario_leituras")
      .select("id, obra_id, edicoes(titulo_edicao, num_paginas), obras(titulo_original, sinopse_padrao, ano_primeira_publicacao)")
      .eq("id", usuario_leitura_id)
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!ul) return json({ error: "leitura não encontrada" }, 404);

    const { data: pre } = await supabase
      .from("leitura_pre")
      .select("intencao, dominio_previo, observacao, leituras!inner(usuario_leitura_id)")
      .eq("leituras.usuario_leitura_id", usuario_leitura_id)
      .maybeSingle();

    const obra: any = ul.obras;
    const ctx = `Livro: ${obra?.titulo_original ?? ""} (${obra?.ano_primeira_publicacao ?? "?"})\nSinopse: ${obra?.sinopse_padrao ?? "—"}\nIntenção do leitor: ${pre?.intencao ?? "—"}\nDomínio prévio: ${pre?.dominio_previo ?? "—"}`;

    const system = "Você é um copiloto de leitura erudito, conciso e provocativo.";
    let userMsg = "";
    if (modo === "perguntas_guia") {
      userMsg = `Com base no contexto, gere 5 perguntas-guia para o leitor refletir enquanto lê.\n\n${ctx}`;
    } else if (modo === "explicar_conceito") {
      userMsg = `O leitor pediu para explicar: "${pergunta}". Use linguagem acessível mas com profundidade.\n\nContexto:\n${ctx}`;
    } else if (modo === "resumo_capitulo") {
      userMsg = `Sintetize as ideias centrais do capítulo/trecho abaixo em formato de tópicos editoriais.\n\n${pergunta ?? ""}\n\nContexto:\n${ctx}`;
    } else {
      userMsg = `Pergunta do leitor: ${pergunta}\n\nContexto:\n${ctx}`;
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (r.status === 429) return json({ error: "rate_limit", message: "Limite da IA atingido." }, 429);
    if (r.status === 402) return json({ error: "payment_required", message: "Créditos esgotados." }, 402);
    if (!r.ok) return json({ error: "ai_error", message: await r.text() }, 500);

    const data = await r.json();
    const texto = data.choices?.[0]?.message?.content ?? "";

    await supabase.from("ia_interacoes").insert({
      user_id: u.user.id,
      tipo: `leitura_${modo}`,
      input_text: pergunta ?? null,
      output_text: texto,
      contexto: { usuario_leitura_id },
    });

    return json({ texto });
  } catch (e: any) {
    console.error(e);
    return json({ error: "internal", message: e?.message ?? String(e) }, 500);
  }
});
