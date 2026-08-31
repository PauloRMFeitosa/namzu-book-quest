// Service worker dedicado a Web Push.
// Só é registrado quando o usuário ATIVA os lembretes por push (opt-in).
// Diferente do kill-switch sw.js, este permanece ativo para receber pushes —
// mas mantém a limpeza de caches obsoletos no activate, para não reintroduzir
// as regressões de cache que o kill-switch resolvia. NÃO faz cache de rede.

function isOwnWorkboxCache(name) {
  const hasBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return hasBucket && name.endsWith(self.registration.scope);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(isOwnWorkboxCache).map((n) => caches.delete(n)));
      } catch (_) {
        // ignora
      }
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("push", (event) => {
  let dados = { title: "NAMZU", body: "Hora da sua leitura!", url: "/metas" };
  try {
    if (event.data) dados = { ...dados, ...event.data.json() };
  } catch (_) {
    if (event.data) dados.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: "meta-diaria",
      renotify: true,
      data: { url: dados.url || "/metas" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/metas";
  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clientes) {
        if ("focus" in c) {
          try {
            c.navigate(destino);
          } catch (_) {
            // alguns navegadores bloqueiam navigate; apenas foca
          }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })(),
  );
});
