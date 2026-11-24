// Garante que o usuário autenticado tenha um registro em `perfis` (idempotente).
//
// O trigger `handle_new_user_perfil` já cria o perfil no cadastro; esta função
// é a rede de segurança para contas antigas ou criadas por OAuth antes do
// trigger existir.
//
// Por padrão cria apenas o perfil de quem chama. O backfill de todos os
// usuários (comportamento antigo) fica restrito a admins: `{ "todos": true }`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { autenticarUsuario, usuarioEhAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

type UsuarioBase = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function montarPerfil(u: UsuarioBase) {
  const md = (u.user_metadata ?? {}) as Record<string, any>;
  const prefixoEmail = u.email?.split("@")[0];
  const nome = md.display_name || md.full_name || md.name || (prefixoEmail ?? "Usuário");
  const baseUsername =
    (md.username || prefixoEmail || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "") || "user";
  return {
    user_id: u.id,
    username: `${baseUsername}_${u.id.slice(0, 6)}`,
    nome_exibicao: nome,
    avatar_url: md.avatar_url || md.picture || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await autenticarUsuario(req);
    if (!auth.ok) return json({ ok: false, error: auth.erro }, auth.status);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let corpo: Record<string, unknown> = {};
    try {
      corpo = (await req.json()) ?? {};
    } catch {
      // chamada sem corpo: comportamento padrão (perfil de quem chama)
    }

    // ── Backfill de todos os usuários: somente admin ─────────────────────
    if (corpo.todos === true) {
      if (!(await usuarioEhAdmin(auth.usuario.id))) {
        return json({ ok: false, error: "Acesso negado" }, 403);
      }

      // Paginação básica até 1000 usuários
      const { data: usersResp, error: usersErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersErr) throw usersErr;
      const users = usersResp.users ?? [];

      const { data: existentes } = await admin
        .from("perfis")
        .select("user_id")
        .in("user_id", users.map((u) => u.id));
      const jaExiste = new Set((existentes ?? []).map((p: any) => p.user_id));

      let created = 0;
      for (const u of users) {
        if (jaExiste.has(u.id)) continue;
        const { error: insErr } = await admin.from("perfis").insert(montarPerfil(u));
        if (!insErr) created++;
      }
      return json({ ok: true, total: users.length, created });
    }

    // ── Padrão: apenas o perfil do próprio usuário ───────────────────────
    const { data: existente, error: selErr } = await admin
      .from("perfis")
      .select("user_id")
      .eq("user_id", auth.usuario.id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existente) return json({ ok: true, total: 1, created: 0 });

    const { error: insErr } = await admin.from("perfis").insert(
      montarPerfil({
        id: auth.usuario.id,
        email: auth.usuario.email,
        user_metadata: auth.usuario.metadata,
      }),
    );
    if (insErr) throw insErr;
    return json({ ok: true, total: 1, created: 1 });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
