// Kill-switch service worker.
// Substitui o SW antigo (que causava recarregamento ao voltar para a aba)
// e se autodesregistra, devolvendo o controle total ao navegador.
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
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
