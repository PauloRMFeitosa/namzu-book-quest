// Helpers de Web Push para os lembretes de meta diária de leitura.
// O opt-in registra um service worker dedicado (/push-sw.js) e salva a
// inscrição na tabela push_subscriptions. Ao desativar, remove a inscrição.

import { supabase } from "@/integrations/supabase/client";

const PUSH_SW_URL = "/push-sw.js";
export const PUSH_FLAG = "namzu-push-enabled";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSuportado = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const pushConfiguravel = (): boolean => pushSuportado() && Boolean(VAPID_PUBLIC_KEY);

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function registrarSW(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register(PUSH_SW_URL);
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Ativa os lembretes por push: pede permissão, cria a inscrição e persiste.
 * Retorna true em sucesso. Lança erro com mensagem amigável em falhas.
 */
export async function ativarPush(userId: string): Promise<boolean> {
  if (!pushSuportado()) throw new Error("Seu navegador não suporta notificações push.");
  if (!VAPID_PUBLIC_KEY) throw new Error("Push não configurado no servidor (VAPID ausente).");

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    throw new Error("Permissão de notificação negada.");
  }

  const reg = await registrarSW();

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error("Falha ao criar inscrição de push.");

  const { error } = await (supabase as any).from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;

  try {
    localStorage.setItem(PUSH_FLAG, "1");
  } catch {}
  return true;
}

/** Desativa os lembretes por push neste dispositivo. */
export async function desativarPush(userId: string): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await (supabase as any).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    }
  } catch {
    // best-effort
  }
  try {
    localStorage.removeItem(PUSH_FLAG);
  } catch {}
}
