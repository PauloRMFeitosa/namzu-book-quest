// Edge function: obra-estatisticas
// Retorna estatísticas agregadas (de TODOS os usuários) de uma obra.
// Usa service role para bypassar RLS de usuario_livros.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { obra_id } = await req.json().catch(() => ({}));
    if (!obra_id || typeof obra_id !== "string") {
      return json({ error: "obra_id obrigatório" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: livros, error } = await supabase
      .from("usuario_livros")
      .select("id, status, nota")
      .eq("obra_id", obra_id);
    if (error) throw error;

    const ids = (livros ?? []).map((l: any) => l.id);

    // Considera também leituras concluídas/lendo registradas em usuario_leituras
    let lendoExtra = new Set<string>();
    let concluidoExtra = new Set<string>();
    if (ids.length) {
      const { data: exps } = await supabase
        .from("usuario_leituras")
        .select("usuario_livro_id, status")
        .in("usuario_livro_id", ids);
      for (const e of exps ?? []) {
        if (e.status === "lendo") lendoExtra.add(e.usuario_livro_id);
        if (e.status === "concluido") concluidoExtra.add(e.usuario_livro_id);
      }
    }

    let lidos = 0;
    let lendo = 0;
    let quero = 0;
    const notas: number[] = [];

    for (const l of livros ?? []) {
      if (l.nota != null) notas.push(Number(l.nota));
      const isLido =
        l.status === "lido" || l.status === "concluido" || concluidoExtra.has(l.id);
      const isLendo = !isLido && (l.status === "lendo" || l.status === "relendo" || lendoExtra.has(l.id));
      if (isLido) lidos++;
      else if (isLendo) lendo++;
      else if (l.status === "quero_ler") quero++;
    }

    const media_nota = notas.length
      ? notas.reduce((s, n) => s + n, 0) / notas.length
      : 0;

    return json({
      lidos,
      lendo,
      quero,
      total_avaliacoes: notas.length,
      media_nota,
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "erro" }, 500);
  }
});
