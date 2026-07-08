// Edge function: conciliar-obra
// Aplica conciliação manual de uma obra com um QID específico do Wikidata,
// enriquece os campos da obra, registra em fontes_externas e devolve os
// autores (P50) do item — casados com os autores locais da obra — para
// enriquecimento em cadeia via conciliar-autor.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  wbgetentities,
  resolveLabels,
  normalizeText,
  claimEntityIds,
  claimYear,
  claimIdioma,
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
    const obraId: string = body?.obra_id;
    const qid: string = body?.qid;
    const sobrescrever: boolean = body?.sobrescrever === true;
    if (!obraId || !qid) return json(400, { error: "obra_id e qid são obrigatórios" });

    const { data: obra, error: obraErr } = await admin
      .from("obras")
      .select("id, titulo_original, sinopse_padrao, ano_primeira_publicacao, idioma_original")
      .eq("id", obraId)
      .maybeSingle();
    if (obraErr || !obra) return json(404, { error: "Obra não encontrada" });

    const entities = await wbgetentities([qid]);
    const entity = entities[qid];
    if (!entity) return json(404, { error: "QID não encontrado no Wikidata" });

    const descricao: string | null =
      entity.descriptions?.pt?.value ?? entity.descriptions?.en?.value ?? null;
    const ano = claimYear(entity);
    const idioma = claimIdioma(entity);

    // Enriquece campos: por padrão preenche apenas os vazios;
    // com sobrescrever=true, substitui pelos dados do Wikidata.
    const upd: Record<string, unknown> = {
      metadata_source: "wikidata",
      metadata_score: 100,
      metadata_checked_at: new Date().toISOString(),
    };
    if (descricao && (sobrescrever || !(obra as any).sinopse_padrao)) {
      upd.sinopse_padrao = descricao;
    }
    if (ano && (sobrescrever || !(obra as any).ano_primeira_publicacao)) {
      upd.ano_primeira_publicacao = ano;
    }
    // Idioma: só troca o default 'pt-BR' quando o Wikidata indica outro idioma
    if (
      idioma && idioma !== "pt" &&
      (sobrescrever || (obra as any).idioma_original === "pt-BR")
    ) {
      upd.idioma_original = idioma;
    }

    const { error: updErr } = await admin.from("obras").update(upd).eq("id", obraId);
    if (updErr) return json(500, { error: updErr.message });

    // fontes_externas upsert (obra ↔ QID)
    const { data: existingFonte } = await admin
      .from("fontes_externas")
      .select("id")
      .eq("tipo_entidade", "obra" as any)
      .eq("entidade_id", obraId)
      .eq("fonte", "wikidata")
      .maybeSingle();
    const fontePayload: any = {
      tipo_entidade: "obra",
      entidade_id: obraId,
      fonte: "wikidata",
      identificador_externo: qid,
      url_externa: `https://www.wikidata.org/wiki/${qid}`,
      dados_externos: entity,
      data_sincronizacao: new Date().toISOString(),
    };
    if (existingFonte?.id) {
      await admin.from("fontes_externas").update(fontePayload).eq("id", existingFonte.id);
    } else {
      await admin.from("fontes_externas").insert(fontePayload);
    }

    // Limpa candidatos pendentes da obra
    await admin.from("obras_candidatos_wikidata").delete().eq("obra_id", obraId);

    // ── Autores do item (P50) para enriquecimento em cadeia ────────────────
    const autorQids = claimEntityIds(entity, "P50").slice(0, 10);
    const autorLabels = autorQids.length ? await resolveLabels(autorQids) : {};

    // Autores locais vinculados à obra
    const { data: oas } = await admin
      .from("obra_autores")
      .select("ordem, autores(id, nome_completo, nome_normalizado, status_conciliacao)")
      .eq("obra_id", obraId)
      .order("ordem", { ascending: true });
    const autoresLocais = (oas ?? [])
      .map((oa: any) => oa.autores)
      .filter(Boolean) as Array<{
        id: string;
        nome_completo: string;
        nome_normalizado: string | null;
        status_conciliacao: string;
      }>;

    // Autores já conciliados com esses QIDs (via fontes_externas)
    const qidParaAutorConciliado: Record<string, string> = {};
    if (autorQids.length) {
      const { data: fontes } = await admin
        .from("fontes_externas")
        .select("entidade_id, identificador_externo")
        .eq("tipo_entidade", "autor" as any)
        .eq("fonte", "wikidata")
        .in("identificador_externo", autorQids);
      for (const f of fontes ?? []) {
        qidParaAutorConciliado[(f as any).identificador_externo] = (f as any).entidade_id;
      }
    }

    const autoresWikidata = autorQids.map((q) => {
      const nome = autorLabels[q] ?? q;
      const norm = normalizeText(nome);
      const conciliadoId = qidParaAutorConciliado[q] ?? null;
      let sugestaoId =
        autoresLocais.find(
          (a) => (a.nome_normalizado ?? normalizeText(a.nome_completo)) === norm,
        )?.id ?? null;
      // Caso comum: obra com um único autor local e um único autor no Wikidata
      if (!sugestaoId && !conciliadoId && autorQids.length === 1 && autoresLocais.length === 1) {
        sugestaoId = autoresLocais[0].id;
      }
      return {
        qid: q,
        nome,
        url_wikidata: `https://www.wikidata.org/wiki/${q}`,
        autor_conciliado_id: conciliadoId,
        sugestao_autor_id: sugestaoId ?? conciliadoId,
      };
    });

    return json(200, {
      ok: true,
      qid,
      campos_atualizados: Object.keys(upd),
      autores_wikidata: autoresWikidata,
      autores_obra: autoresLocais.map((a) => ({
        id: a.id,
        nome_completo: a.nome_completo,
        status_conciliacao: a.status_conciliacao,
      })),
    });
  } catch (err: any) {
    console.error("conciliar-obra error", err);
    return json(500, { error: err?.message ?? "internal" });
  }
});
