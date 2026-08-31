// deno-lint-ignore-file no-explicit-any
// Envia lembretes de meta diária de leitura pelos canais e-mail (Resend) e
// Web Push (VAPID). O canal in-app é tratado por função SQL no banco.
//
// Invocada periodicamente (pg_cron + pg_net). É idempotente: cada usuário só
// recebe um lembrete por dia por canal (garantido pela tabela meta_lembretes_log).
//
// Secrets esperados:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetados pelo runtime)
//   RESEND_API_KEY, EMAIL_FROM               (canal e-mail — opcional)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT  (canal push — opcional)
//   LEMBRETES_CRON_SECRET                    (protege a invocação — opcional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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

const FRASES = [
  "Que tal alguns minutos de leitura agora? Sua sequência agradece! 🔥",
  "Ainda dá tempo de bater sua meta de hoje. Bora ler? 📖",
  "Seu livro está esperando por você. Uma página já é um começo!",
  "Não perca sua ofensiva! Leia um pouquinho antes de dormir. ✨",
  "Pequenos hábitos, grandes histórias. Vamos para a leitura de hoje?",
];
const frase = () => FRASES[Math.floor(Math.random() * FRASES.length)];

const unidade = (tipo: string, n: number) =>
  tipo === "minutos" ? `${n} ${n === 1 ? "minuto" : "minutos"}` : `${n} ${n === 1 ? "página" : "páginas"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Proteção opcional da invocação
    const cronSecret = Deno.env.get("LEMBRETES_CRON_SECRET");
    if (cronSecret) {
      const auth = req.headers.get("Authorization") ?? "";
      if (auth !== `Bearer ${cronSecret}`) {
        return json({ error: "unauthorized" }, 401);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") ?? "NAMZU <lembretes@namzu.app>";
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@namzu.app";

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    }

    // Lembretes pendentes (e-mail e push) neste instante
    const { data: pendentes, error } = await admin.rpc("lembretes_meta_diaria_pendentes");
    if (error) throw error;

    const alvos = (pendentes ?? []).filter((p: any) => p.canal === "email" || p.canal === "push");

    let enviadosEmail = 0;
    let enviadosPush = 0;

    for (const p of alvos) {
      const faltante = Math.max(1, Math.ceil(Number(p.faltante)));

      if (p.canal === "email") {
        if (!resendKey) continue; // canal indisponível sem a chave
        try {
          const { data: userData } = await admin.auth.admin.getUserById(p.user_id);
          const email = userData?.user?.email;
          if (!email) continue;

          const corpo = `
            <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#1A3B8B;margin:0 0 8px">Sua leitura de hoje te espera 📚</h2>
              <p style="font-size:15px;color:#333;line-height:1.5">${frase()}</p>
              <p style="font-size:15px;color:#333">Faltam <strong>${unidade(p.tipo_meta, faltante)}</strong> para bater sua meta diária.</p>
              <a href="https://namzu.app/metas"
                 style="display:inline-block;margin-top:12px;background:#1A3B8B;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">
                Ler agora
              </a>
            </div>`;

          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [email],
              subject: "📖 Não esqueça da sua leitura de hoje",
              html: corpo,
            }),
          });
          if (!resp.ok) {
            console.error("resend", await resp.text());
            continue;
          }
          await admin.rpc("marcar_lembrete_meta_enviado", { _user_id: p.user_id, _canal: "email" });
          enviadosEmail++;
        } catch (e) {
          console.error("email", p.user_id, (e as any)?.message);
        }
      }

      if (p.canal === "push") {
        if (!vapidPublic || !vapidPrivate) continue; // canal indisponível sem VAPID
        try {
          const { data: subs } = await admin
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", p.user_id);

          if (!subs || subs.length === 0) continue;

          const payload = JSON.stringify({
            title: "Sua meta de leitura de hoje",
            body: frase(),
            url: "/metas",
          });

          let algumSucesso = false;
          for (const s of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
              );
              algumSucesso = true;
            } catch (err: any) {
              // Inscrição expirada/inválida → remove
              if (err?.statusCode === 404 || err?.statusCode === 410) {
                await admin.from("push_subscriptions").delete().eq("id", s.id);
              } else {
                console.error("push send", err?.statusCode, err?.message);
              }
            }
          }
          if (algumSucesso) {
            await admin.rpc("marcar_lembrete_meta_enviado", { _user_id: p.user_id, _canal: "push" });
            enviadosPush++;
          }
        } catch (e) {
          console.error("push", p.user_id, (e as any)?.message);
        }
      }
    }

    return json({
      ok: true,
      pendentes: alvos.length,
      enviados_email: enviadosEmail,
      enviados_push: enviadosPush,
      email_ativo: Boolean(resendKey),
      push_ativo: Boolean(vapidPublic && vapidPrivate),
    });
  } catch (e: any) {
    console.error("enviar-lembretes-meta", e);
    return json({ error: "internal_error", message: e?.message ?? "erro" }, 500);
  }
});
