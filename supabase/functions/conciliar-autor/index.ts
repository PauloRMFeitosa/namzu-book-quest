// Edge function: conciliar-autor
// Aplica conciliação manual de um autor com um QID específico do Wikidata.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  wbgetentities,
  buildCandidato,
  scoreCandidato,
  normalizeText,
  sortKeyName,
} from "../_shared/wikidata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json(401, { error: "Não autenticado" });

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Token inválido" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json(403, { error: "Acesso negado" });

    const body = await req.json().catch(() => ({}));
    const autorId: string = body?.autor_id;
    const qid: string = body?.qid;
    if (!autorId || !qid) return json(400, { error: "autor_id e qid são obrigatórios" });

    const { data: autorData, error: autorErr } = await admin
      .from("autores")
      .select("id, nome_completo, nome_ordenacao, nome_normalizado, nome_cadastro, aliases, status_conciliacao, tentativas_conciliacao")
      .eq("id", autorId)
      .maybeSingle();
    if (autorErr || !autorData) return json(404, { error: "Autor não encontrado" });

    const entities = await wbgetentities([qid]);
    const entity = entities[qid];
    if (!entity) return json(404, { error: "QID não encontrado no Wikidata" });

    const cand = await buildCandidato(qid, entity);
    const score = scoreCandidato(autorData as any, cand);

    const nomeCadastro = (autorData as any).nome_cadastro ?? (autorData as any).nome_completo;
    const existing: string[] = Array.isArray((autorData as any).aliases)
      ? ((autorData as any).aliases as any[]).map((a) => String(a))
      : [];
    const aliasesFinal = Array.from(
      new Set(
        [...cand.aliases, ...existing, nomeCadastro]
          .map((a) => (a ?? "").toString().trim())
          .filter(Boolean),
      ),
    );

    await admin
      .from("autores")
      .update({
        nome_cadastro: nomeCadastro,
        nome_completo: cand.nome,
        nome_ordenacao: sortKeyName(cand.nome),
        nome_normalizado: normalizeText(cand.nome),
        descricao: cand.descricao,
        data_nascimento: cand.data_nascimento,
        data_falecimento: cand.data_falecimento,
        nacionalidade: cand.nacionalidade,
        foto_url: cand.foto_url,
        aliases: aliasesFinal,
        status_conciliacao: "conciliado",
        data_ultima_conciliacao: new Date().toISOString(),
        tentativas_conciliacao: ((autorData as any).tentativas_conciliacao ?? 0) + 1,
      } as any)
      .eq("id", autorId);

    const { data: existingFonte } = await admin
      .from("fontes_externas")
      .select("id")
      .eq("tipo_entidade", "autor" as any)
      .eq("entidade_id", autorId)
      .eq("fonte", "wikidata")
      .maybeSingle();
    const fontePayload: any = {
      tipo_entidade: "autor",
      entidade_id: autorId,
      fonte: "wikidata",
      identificador_externo: cand.qid,
      url_externa: cand.url_wikidata,
      dados_externos: cand.dados_externos,
      data_sincronizacao: new Date().toISOString(),
    };
    if (existingFonte?.id) {
      await admin.from("fontes_externas").update(fontePayload).eq("id", existingFonte.id);
    } else {
      await admin.from("fontes_externas").insert(fontePayload);
    }

    await admin.from("autores_candidatos_wikidata").delete().eq("autor_id", autorId);

    return json(200, { ok: true, qid, score });
  } catch (err: any) {
    console.error("conciliar-autor error", err);
    return json(500, { error: err?.message ?? "internal" });
  }
});
