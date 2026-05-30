/**
 * Converte uma URL de imagem (remota ou local) em data URL (base64).
 * Tenta fetch direto; se falhar por CORS, usa images.weserv.nl como proxy.
 * Retorna null se todas as tentativas falharem.
 */
export async function imageToDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;

  const attempts: string[] = [url];

  // Proxy CORS público para imagens remotas http(s)
  if (/^https?:\/\//i.test(url)) {
    const stripped = url.replace(/^https?:\/\//i, "");
    attempts.push(`https://images.weserv.nl/?url=${encodeURIComponent(stripped)}`);
  }

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt, { mode: "cors", cache: "no-cache" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) continue;
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      return dataUrl;
    } catch (err) {
      // tenta próximo
      console.warn("[imageToDataUrl] tentativa falhou:", attempt, err);
    }
  }
  return null;
}

/** Garante que a imagem (data URL) carrega de fato no DOM antes de prosseguir. */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (!src) return resolve();
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}
