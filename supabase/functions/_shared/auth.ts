// Autenticação compartilhada entre Edge Functions.
//
// As funções que usam a SERVICE_ROLE_KEY ignoram o RLS, então precisam
// validar quem está chamando antes de gravar qualquer coisa. Este módulo
// centraliza essa validação para evitar cópias divergentes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type UsuarioAutenticado = {
  id: string;
  email: string | null;
  metadata: Record<string, unknown>;
};

export type ResultadoAuth =
  | { ok: true; usuario: UsuarioAutenticado }
  | { ok: false; status: 401 | 403; erro: string };

// Valida o JWT do cabeçalho Authorization e devolve o usuário dono do token.
// A chave anônima sozinha não passa: ela é um JWT válido, mas não pertence a
// nenhum usuário, então `auth.getUser` devolve erro.
export async function autenticarUsuario(req: Request): Promise<ResultadoAuth> {
  const cabecalho = req.headers.get("Authorization") ?? "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, erro: "Não autenticado" };

  const cliente = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await cliente.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, erro: "Token inválido" };

  return {
    ok: true,
    usuario: {
      id: data.user.id,
      email: data.user.email ?? null,
      metadata: (data.user.user_metadata ?? {}) as Record<string, unknown>,
    },
  };
}

// Verifica o papel de admin em `user_roles` usando a chave de serviço.
export async function usuarioEhAdmin(userId: string): Promise<boolean> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export type ResultadoAutorizacao =
  | { ok: true; origem: "cron" | "admin"; usuarioId: string | null }
  | { ok: false; status: 401 | 403; erro: string };

// Autoriza as funções de lote. Passa quem for:
//   - o pg_cron, que envia o cabeçalho `x-cron-secret`. O valor é conferido no
//     banco pela RPC `verificar_segredo_cron`, contra o segredo guardado no
//     Vault. O segredo não existe em variável de ambiente nem no código.
//   - um admin autenticado (chamadas do painel).
// Um cabeçalho `x-cron-secret` errado não cai para a checagem de admin: é
// recusado na hora.
export async function autorizarAdminOuCron(req: Request): Promise<ResultadoAutorizacao> {
  const segredo = (req.headers.get("x-cron-secret") ?? "").trim();
  if (segredo) {
    const servico = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await servico.rpc("verificar_segredo_cron", { p_segredo: segredo });
    if (!error && data === true) return { ok: true, origem: "cron", usuarioId: null };
    return { ok: false, status: 401, erro: "Segredo do agendador inválido" };
  }

  const auth = await autenticarUsuario(req);
  if (!auth.ok) return auth;
  if (!(await usuarioEhAdmin(auth.usuario.id))) {
    return { ok: false, status: 403, erro: "Acesso negado" };
  }
  return { ok: true, origem: "admin", usuarioId: auth.usuario.id };
}
