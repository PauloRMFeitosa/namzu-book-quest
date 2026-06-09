// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clampPercentual = (value: unknown) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized", message: "Faça login novamente." }, 401);

    const body = await req.json();
    const percentual = clampPercentual(body.percentual);
    const status = percentual >= 100 ? "concluido" : percentual > 0 ? "lendo" : "nao_iniciado";
    const dataFim = typeof body.data_fim === "string" && body.data_fim ? body.data_fim : new Date().toISOString().slice(0, 10);
    const conclusaoIso = new Date(`${dataFim}T12:00:00`).toISOString();
    const nowIso = new Date().toISOString();
    const paginaAtual = body.pagina_atual == null || body.pagina_atual === "" ? null : Number(body.pagina_atual);
    const capituloAtual = body.capitulo_atual?.toString().trim() || null;
    const registrarSessao = body.registrar_leitura_progresso !== false;

    let usuarioLeituraId = body.usuario_leitura_id?.toString() || null;
    let usuarioLivroId: string | null = null;
    let obraId = body.obra_id?.toString() || null;
    let clubeId = body.clube_id?.toString() || null;

    let edicaoId: string | null = null;

    if (usuarioLeituraId) {
      const { data: leitura, error } = await admin
        .from("usuario_leituras")
        .select("id, clube_id, usuario_livro_id, usuario_livros!inner(id, user_id, obra_id, edicao_id, status)")
        .eq("id", usuarioLeituraId)
        .maybeSingle();
      if (error) throw error;
      const dono = (leitura as any)?.usuario_livros?.user_id;
      if (!leitura || dono !== user.id) return json({ error: "forbidden", message: "Leitura não encontrada." }, 403);
      usuarioLivroId = (leitura as any).usuario_livro_id;
      obraId = (leitura as any).usuario_livros?.obra_id ?? obraId;
      edicaoId = (leitura as any).usuario_livros?.edicao_id ?? null;
      clubeId = clubeId ?? ((leitura as any).clube_id || null);
    }

    // Aceita total_paginas para persistir em edicoes.num_paginas quando vazio
    const totalPaginasInput = body.total_paginas != null && body.total_paginas !== ""
      ? Number(body.total_paginas)
      : null;

    if (!obraId) return json({ error: "obra_id_required", message: "Livro não identificado." }, 400);

    const podeUsarClube = async (id: string) => {
      const [{ data: membro }, { data: curador }, { data: adminRole }] = await Promise.all([
        admin.from("clube_membros").select("clube_id").eq("clube_id", id).eq("user_id", user.id).eq("status", "ativo").maybeSingle(),
        admin.from("clubes").select("id").eq("id", id).eq("curador_id", user.id).maybeSingle(),
        admin.from("user_roles").select("user_id").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      ]);
      return Boolean(membro || curador || adminRole);
    };

    if (clubeId && !(await podeUsarClube(clubeId))) {
      return json({ error: "forbidden", message: "Você não tem acesso ativo a este clube." }, 403);
    }

    if (!usuarioLivroId) {
      const { data: livroExistente, error: livroErr } = await admin
        .from("usuario_livros")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("obra_id", obraId)
        .maybeSingle();
      if (livroErr) throw livroErr;
      if (livroExistente?.id) {
        usuarioLivroId = livroExistente.id;
      } else {
        const { data: novoLivro, error: novoLivroErr } = await admin
          .from("usuario_livros")
          .insert({ user_id: user.id, obra_id: obraId, status: status === "concluido" ? "lido" : "lendo" })
          .select("id")
          .single();
        if (novoLivroErr) throw novoLivroErr;
        usuarioLivroId = novoLivro.id;
      }
    }

    if (!usuarioLeituraId && usuarioLivroId && clubeId) {
      const { data: leituraExistente, error: leituraErr } = await admin
        .from("usuario_leituras")
        .select("id")
        .eq("usuario_livro_id", usuarioLivroId)
        .eq("clube_id", clubeId)
        .maybeSingle();
      if (leituraErr) throw leituraErr;
      if (leituraExistente?.id) {
        usuarioLeituraId = leituraExistente.id;
      } else {
        const { data: novaLeitura, error: novaLeituraErr } = await admin
          .from("usuario_leituras")
          .insert({
            usuario_livro_id: usuarioLivroId,
            tipo_origem: "clube",
            clube_id: clubeId,
            status: status === "concluido" ? "concluido" : "lendo",
            data_inicio: new Date().toISOString().slice(0, 10),
            data_fim: status === "concluido" ? dataFim : null,
          })
          .select("id")
          .single();
        if (novaLeituraErr) throw novaLeituraErr;
        usuarioLeituraId = novaLeitura.id;
      }
    }

    // Se o usuário informou total_paginas e a edição ainda não tem num_paginas, persistir
    if (totalPaginasInput && totalPaginasInput > 0 && usuarioLivroId) {
      if (!edicaoId) {
        const { data: ul } = await admin.from("usuario_livros").select("edicao_id").eq("id", usuarioLivroId).maybeSingle();
        edicaoId = (ul as any)?.edicao_id ?? null;
      }
      if (edicaoId) {
        const { data: ed } = await admin.from("edicoes").select("num_paginas").eq("id", edicaoId).maybeSingle();
        if (!ed?.num_paginas) {
          await admin.from("edicoes").update({ num_paginas: totalPaginasInput }).eq("id", edicaoId);
        }
      }
    }

    if (usuarioLivroId) {
      const livroUpdate: Record<string, unknown> = { updated_at: nowIso };
      if (status === "concluido") {
        livroUpdate.status = "lido";
        livroUpdate.data_fim = dataFim;
      } else {
        const { data: livroAtual } = await admin.from("usuario_livros").select("status").eq("id", usuarioLivroId).maybeSingle();
        if (livroAtual?.status !== "lido") livroUpdate.status = "lendo";
      }
      await admin.from("usuario_livros").update(livroUpdate).eq("id", usuarioLivroId).eq("user_id", user.id);
    }

    if (usuarioLeituraId) {
      const leituraUpdate: Record<string, unknown> = {
        status: status === "concluido" ? "concluido" : "lendo",
        data_fim: status === "concluido" ? dataFim : null,
        updated_at: nowIso,
      };
      const { error } = await admin.from("usuario_leituras").update(leituraUpdate).eq("id", usuarioLeituraId);
      if (error) throw error;
    }

    // Progresso por clube agora é derivado de usuario_leituras + leitura_progresso.
    // A tabela clube_progresso foi descontinuada e não recebe mais escritas.
    const clubesParaAtualizar = new Set<string>();
    if (clubeId) clubesParaAtualizar.add(clubeId);


    if (usuarioLeituraId && registrarSessao) {
      const { data: sessao } = await admin
        .from("leituras")
        .select("id, data_fim")
        .eq("usuario_leitura_id", usuarioLeituraId)
        .eq("tipo", "leitura")
        .order("data_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();
      let leituraId = sessao?.data_fim && status !== "concluido" ? null : sessao?.id;
      if (!leituraId) {
        const { data: novaSessao, error } = await admin
          .from("leituras")
          .insert({ user_id: user.id, usuario_leitura_id: usuarioLeituraId, tipo: "leitura", data_inicio: nowIso, data_fim: status === "concluido" ? nowIso : null })
          .select("id")
          .single();
        if (error) throw error;
        leituraId = novaSessao.id;
      }
      const tempoMin = body.tempo_minutos != null && body.tempo_minutos !== ""
        ? Math.max(0, Math.round(Number(body.tempo_minutos)))
        : null;
      await admin.from("leitura_progresso").insert({
        leitura_id: leituraId,
        user_id: user.id,
        paginas_lidas: Number.isNaN(paginaAtual) ? null : paginaAtual,
        percentual_lido: percentual,
        tempo_leitura_minutos: tempoMin,
      });
      if (status === "concluido") {
        await admin.from("leituras").update({ data_fim: nowIso, updated_at: nowIso }).eq("usuario_leitura_id", usuarioLeituraId).eq("tipo", "leitura").is("data_fim", null);
      }
    }

    return json({ ok: true, usuario_leitura_id: usuarioLeituraId, clubes_atualizados: Array.from(clubesParaAtualizar) });
  } catch (e: any) {
    console.error("salvar-progresso-leitura", e);
    return json({ error: "internal_error", message: e?.message ?? "Erro ao salvar progresso." }, 500);
  }
});