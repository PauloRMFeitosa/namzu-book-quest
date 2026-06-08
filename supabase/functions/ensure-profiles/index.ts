// Backfill perfis a partir de auth.users (idempotente)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lista todos os usuários (paginação básica até 1000)
    const { data: usersResp, error: usersErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersErr) throw usersErr;

    const users = usersResp.users ?? [];

    // Perfis existentes
    const { data: existing } = await admin
      .from("perfis")
      .select("user_id")
      .in("user_id", users.map((u) => u.id));
    const existingSet = new Set((existing ?? []).map((p: any) => p.user_id));

    let created = 0;
    for (const u of users) {
      if (existingSet.has(u.id)) continue;
      const md: any = u.user_metadata ?? {};
      const nome =
        md.display_name || md.full_name || md.name || (u.email?.split("@")[0] ?? "Usuário");
      const baseUsername =
        (md.username || u.email?.split("@")[0] || "user")
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "") || "user";
      const username = `${baseUsername}_${u.id.slice(0, 6)}`;
      const avatar = md.avatar_url || md.picture || null;

      const { error: insErr } = await admin.from("perfis").insert({
        user_id: u.id,
        username,
        nome_exibicao: nome,
        avatar_url: avatar,
      });
      if (!insErr) created++;
    }

    return new Response(
      JSON.stringify({ ok: true, total: users.length, created }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
