// Edge function: reprocessar-autores
// Concilia autores com Wikidata. Padrão idêntico ao reprocessar-generos
// (auth via JWT + verificação de role admin via has_role), mas registra
// execução em integracoes_execucoes / integracoes_execucoes_itens.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  wbsearchentities,
  wbgetentities,
  buildCandidato,
  scoreCandidato,
  normalizeText,
  sortKeyName,
  WikidataCandidato,
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

type Autor = {
  id: string;
  nome_completo: string;
  nome_ordenacao: string | null;
  nome_normalizado: string | null;
  nome_cadastro: string | null;
  aliases: any;
  status_conciliacao: string;
  tentativas_conciliacao: number;
};

async function searchAutorMultiPass(autor: Autor): Promise<string[]> {
  const queries = [
    autor.nome_completo,
    autor.nome_ordenacao,
    autor.nome_normalizado,
  ].filter((q): q is string => !!q?.trim());

  for (const q of queries) {
    const res = await wbsearchentities(q, "pt", 8);
    if (res.length) return res.map((r) => r.id);
    // fallback em inglês para o mesmo termo
    const resEn = await wbsearchentities(q, "en", 8);
    if (resEn.length) return resEn.map((r) => r.id);
  }
  return [];
}

async function aplicarConciliacao(
  admin: ReturnType<typeof createClient>,
  autor: Autor,
  cand: WikidataCandidato,
) {
  const nomeCadastro = autor.nome_cadastro ?? autor.nome_completo;

  // aliases finais: wikidata + existentes + nome_cadastro
  const existing: string[] = Array.isArray(autor.aliases)
    ? (autor.aliases as any[]).map((a) => String(a))
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
      tentativas_conciliacao: (autor.tentativas_conciliacao ?? 0) + 1,
    } as any)
    .eq("id", autor.id);

  // fontes_externas upsert
  const { data: existingFonte } = await admin
    .from("fontes_externas")
    .select("id")
    .eq("tipo_entidade", "autor" as any)
    .eq("entidade_id", autor.id)
    .eq("fonte", "wikidata")
    .maybeSingle();

  const fontePayload: any = {
    tipo_entidade: "autor",
    entidade_id: autor.id,
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

  // limpa candidatos antigos
  await admin.from("autores_candidatos_wikidata").delete().eq("autor_id", autor.id);
}

async function salvarCandidatosRevisao(
  admin: ReturnType<typeof createClient>,
  autorId: string,
  candidatos: Array<{ cand: WikidataCandidato; score: number }>,
) {
  await admin.from("autores_candidatos_wikidata").delete().eq("autor_id", autorId);
  if (!candidatos.length) return;
  const rows = candidatos.slice(0, 5).map(({ cand, score }) => ({
    autor_id: autorId,
    qid: cand.qid,
    url_wikidata: cand.url_wikidata,
    nome: cand.nome,
    descricao: cand.descricao,
    data_nascimento: cand.data_nascimento,
    data_falecimento: cand.data_falecimento,
    nacionalidade: cand.nacionalidade,
    foto_url: cand.foto_url,
    score_namzu: score,
    dados_externos: cand.dados_externos,
  }));
  await admin.from("autores_candidatos_wikidata").insert(rows as any);
}

export async function processarAutor(
  admin: ReturnType<typeof createClient>,
  autor: Autor,
): Promise<{
  status: "sucesso" | "revisao_manual" | "nao_encontrado" | "erro";
  mensagem: string | null;
  best?: { qid: string; score: number };
}> {
  const qids = await searchAutorMultiPass(autor);
  if (!qids.length) {
    await admin
      .from("autores")
      .update({
        status_conciliacao: "nao_encontrado",
        data_ultima_conciliacao: new Date().toISOString(),
        tentativas_conciliacao: (autor.tentativas_conciliacao ?? 0) + 1,
      } as any)
      .eq("id", autor.id);
    return { status: "nao_encontrado", mensagem: "Nenhum candidato no Wikidata" };
  }

  const entidades = await wbgetentities(qids.slice(0, 8));
  const candidatos: Array<{ cand: WikidataCandidato; score: number }> = [];
  for (const qid of qids) {
    const ent = entidades[qid];
    if (!ent) continue;
    const cand = await buildCandidato(qid, ent);
    const score = scoreCandidato(autor, cand);
    candidatos.push({ cand, score });
  }

  candidatos.sort((a, b) => b.score - a.score);
  const best = candidatos[0];
  if (!best) {
    return { status: "nao_encontrado", mensagem: "Sem detalhamento utilizável" };
  }

  if (best.score >= 90) {
    await aplicarConciliacao(admin, autor, best.cand);
    return {
      status: "sucesso",
      mensagem: `Conciliado com ${best.cand.qid} (score ${best.score})`,
      best: { qid: best.cand.qid, score: best.score },
    };
  }

  await salvarCandidatosRevisao(admin, autor.id, candidatos);
  await admin
    .from("autores")
    .update({
      status_conciliacao: "revisao_manual",
      data_ultima_conciliacao: new Date().toISOString(),
      tentativas_conciliacao: (autor.tentativas_conciliacao ?? 0) + 1,
    } as any)
    .eq("id", autor.id);

  return {
    status: "revisao_manual",
    mensagem: `Revisão manual (melhor score ${best.score})`,
    best: { qid: best.cand.qid, score: best.score },
  };
}

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
    const quantidade = Math.max(1, Math.min(500, Number(body?.quantidade ?? 10)));
    const statusFiltro: string[] = Array.isArray(body?.status) && body.status.length
      ? body.status
      : ["pendente", "nao_encontrado", "revisao_manual"];
    const autorIdEspecifico: string | null = body?.autor_id ?? null;

    // Seleciona autores
    let autores: Autor[] = [];
    if (autorIdEspecifico) {
      const { data } = await admin
        .from("autores")
        .select("id, nome_completo, nome_ordenacao, nome_normalizado, nome_cadastro, aliases, status_conciliacao, tentativas_conciliacao")
        .eq("id", autorIdEspecifico)
        .maybeSingle();
      if (data) autores = [data as Autor];
    } else {
      const { data } = await admin
        .from("autores")
        .select("id, nome_completo, nome_ordenacao, nome_normalizado, nome_cadastro, aliases, status_conciliacao, tentativas_conciliacao")
        .in("status_conciliacao", statusFiltro)
        .order("tentativas_conciliacao", { ascending: true })
        .limit(quantidade);
      autores = (data ?? []) as Autor[];
    }

    // Cria execução
    const { data: execRow, error: execErr } = await admin
      .from("integracoes_execucoes")
      .insert({
        tipo_processo: "reprocessamento_autores",
        fonte: "wikidata",
        status: "em_andamento",
        quantidade_solicitada: autores.length,
      } as any)
      .select("id")
      .single();
    if (execErr || !execRow) return json(500, { error: execErr?.message ?? "Falha ao criar execução" });
    const execucaoId = execRow.id;

    const logs: any[] = [];
    let sucesso = 0;
    let revisao = 0;
    let naoEncontrado = 0;
    let erros = 0;

    for (const autor of autores) {
      try {
        const r = await processarAutor(admin, autor);
        if (r.status === "sucesso") sucesso++;
        else if (r.status === "revisao_manual") revisao++;
        else if (r.status === "nao_encontrado") naoEncontrado++;

        await admin.from("integracoes_execucoes_itens").insert({
          execucao_id: execucaoId,
          entidade_id: autor.id,
          tipo_entidade: "autor",
          nome_referencia: autor.nome_completo,
          status: r.status,
          mensagem: r.mensagem,
          dados_resposta: r.best ?? null,
        } as any);

        logs.push({
          autor_id: autor.id,
          nome: autor.nome_completo,
          resultado: r.status,
          mensagem: r.mensagem,
          ...(r.best ?? {}),
        });
      } catch (e: any) {
        erros++;
        await admin.from("integracoes_execucoes_itens").insert({
          execucao_id: execucaoId,
          entidade_id: autor.id,
          tipo_entidade: "autor",
          nome_referencia: autor.nome_completo,
          status: "erro",
          mensagem: e?.message ?? "erro",
        } as any);
        logs.push({
          autor_id: autor.id,
          nome: autor.nome_completo,
          resultado: "erro",
          mensagem: e?.message ?? "erro",
        });
      }
    }

    const processadas = sucesso + revisao + naoEncontrado + erros;
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

    return json(200, {
      execucao_id: execucaoId,
      processadas,
      sucesso,
      revisao_manual: revisao,
      nao_encontrado: naoEncontrado,
      erros,
      fonte: "wikidata",
      executado_em: new Date().toISOString(),
      logs,
    });
  } catch (err: any) {
    console.error("reprocessar-autores error", err);
    return json(500, { error: err?.message ?? "internal" });
  }
});
