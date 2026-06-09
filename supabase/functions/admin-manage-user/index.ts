import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERFIL_FIELDS = [
  "username", "nome_exibicao", "bio", "avatar_url", "banner_url",
  "cidade", "pais", "tipo_perfil", "verificado",
  "instagram_url", "youtube_url", "tiktok_url", "site_url",
];

const GAM_FIELDS = ["xp_total", "nivel", "streak_atual", "streak_maximo"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

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

    const body = await req.json();
    const { action, user_id, email, password, full_name, perfil, gamificacao, is_admin } = body ?? {};

    if (!action || !user_id) return json(400, { error: "action e user_id obrigatórios" });
    if (user_id === userData.user.id && action === "delete") {
      return json(400, { error: "Você não pode excluir sua própria conta" });
    }

    if (action === "update") {
      const attrs: Record<string, unknown> = {};
      if (email) attrs.email = email;
      if (password) attrs.password = password;
      if (full_name !== undefined) attrs.user_metadata = { full_name };
      if (Object.keys(attrs).length) {
        const { error } = await admin.auth.admin.updateUserById(user_id, attrs);
        if (error) return json(400, { error: error.message });
      }

      // perfis
      if (perfil && typeof perfil === "object") {
        const patch: Record<string, unknown> = {};
        for (const k of PERFIL_FIELDS) {
          if (perfil[k] !== undefined) patch[k] = perfil[k] === "" ? null : perfil[k];
        }
        if (Object.keys(patch).length) {
          const { data: existing } = await admin.from("perfis").select("user_id").eq("user_id", user_id).maybeSingle();
          if (existing) {
            const { error } = await admin.from("perfis").update(patch).eq("user_id", user_id);
            if (error) return json(400, { error: `perfis: ${error.message}` });
          } else {
            const insertPayload: Record<string, unknown> = { user_id, ...patch };
            if (!insertPayload.username) insertPayload.username = `user_${user_id.slice(0, 8)}`;
            if (!insertPayload.nome_exibicao) insertPayload.nome_exibicao = full_name ?? insertPayload.username;
            const { error } = await admin.from("perfis").insert(insertPayload);
            if (error) return json(400, { error: `perfis insert: ${error.message}` });
          }
        }
      }

      // gamificacao_perfis
      if (gamificacao && typeof gamificacao === "object") {
        const patch: Record<string, unknown> = {};
        for (const k of GAM_FIELDS) {
          if (gamificacao[k] !== undefined && gamificacao[k] !== "") patch[k] = Number(gamificacao[k]);
        }
        if (Object.keys(patch).length) {
          const { data: existing } = await admin.from("gamificacao_perfis").select("user_id").eq("user_id", user_id).maybeSingle();
          if (existing) {
            const { error } = await admin.from("gamificacao_perfis").update(patch).eq("user_id", user_id);
            if (error) return json(400, { error: `gamificacao: ${error.message}` });
          } else {
            const { error } = await admin.from("gamificacao_perfis").insert({ user_id, ...patch });
            if (error) return json(400, { error: `gamificacao insert: ${error.message}` });
          }
        }
      }

      // admin role
      if (typeof is_admin === "boolean") {
        if (is_admin) {
          await admin.from("user_roles").upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
        } else {
          await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
        }
      }

      return json(200, { ok: true });
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    return json(400, { error: "action inválida" });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
