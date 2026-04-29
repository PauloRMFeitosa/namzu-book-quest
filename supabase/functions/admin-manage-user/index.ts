import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const { action, user_id, email, password, full_name } = body ?? {};

    if (!action || !user_id) return json(400, { error: "action e user_id obrigatórios" });
    if (user_id === userData.user.id && action === "delete") {
      return json(400, { error: "Você não pode excluir sua própria conta" });
    }

    if (action === "update") {
      const attrs: Record<string, unknown> = {};
      if (email) attrs.email = email;
      if (password) attrs.password = password;
      if (full_name !== undefined) attrs.user_metadata = { full_name };
      const { error } = await admin.auth.admin.updateUserById(user_id, attrs);
      if (error) return json(400, { error: error.message });
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
