import { useRef, useState, useMemo, useEffect } from "react";
import { toPng } from "html-to-image";
import logoNamzu from "@/assets/logo-namzu.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MinhasLeiturasShareCard, SHARE_SIZE } from "./MinhasLeiturasShareCard";
import { EstatisticasPeriodo } from "@/hooks/leituras/useMinhasLeituras";
import { imageToDataUrl, preloadImage } from "@/lib/imageToDataUrl";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string;
  periodoLabel: string;
  stats: EstatisticasPeriodo;
}

export const MinhasLeiturasShareModal = ({ open, onOpenChange, nome, periodoLabel, stats }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [capas, setCapas] = useState<Record<string, string>>({});
  const [logoData, setLogoData] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const scale = useMemo(() => Math.min(320 / SHARE_SIZE.w, 540 / SHARE_SIZE.h), []);

  // Pré-resolve capas e logo em dataURL antes de habilitar geração
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreparing(true);
    setCapas({});
    setLogoData(null);

    const urls = Array.from(
      new Set(stats.livros.map((l) => l.capa_url).filter((u): u is string => !!u && !u.startsWith("data:"))),
    );

    (async () => {
      const entries = await Promise.all(
        urls.map(async (url) => {
          try {
            const data = await imageToDataUrl(url);
            if (data) await preloadImage(data);
            return [url, data] as const;
          } catch {
            return [url, null] as const;
          }
        }),
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const [u, d] of entries) if (d) map[u] = d;
      setCapas(map);

      try {
        const logo = await imageToDataUrl(logoNamzu);
        if (logo) await preloadImage(logo);
        if (!cancelled) setLogoData(logo);
      } catch {}
      if (!cancelled) setPreparing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, stats.livros]);

  async function generatePng(): Promise<Blob> {
    if (!ref.current) throw new Error("Card não renderizado");
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch {}
    }
    // Aguarda todas imagens do card carregarem completamente
    const imgs = Array.from(ref.current.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
    await new Promise((r) => setTimeout(r, 80));
    const url = await toPng(ref.current, {
      pixelRatio: 1,
      cacheBust: true,
      width: SHARE_SIZE.w,
      height: SHARE_SIZE.h,
      skipFonts: false,
    });
    const res = await fetch(url);
    return await res.blob();
  }

  async function handleDownload() {
    try {
      setBusy("download");
      const blob = await generatePng();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `namzu-leituras-${periodoLabel.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Imagem baixada");
    } catch (e: any) {
      console.error("[ShareLeituras] download:", e);
      toast.error("Falha: " + (e?.message ?? "erro"));
    } finally { setBusy(null); }
  }

  async function handleShare() {
    try {
      setBusy("share");
      const blob = await generatePng();
      const file = new File([blob], "namzu-leituras.png", { type: "image/png" });
      const navAny = navigator as any;
      if (navAny.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title: "Minhas Leituras", text: `Minhas leituras — ${periodoLabel}`, files: [file] });
      } else {
        await handleDownload();
      }
    } catch (e: any) {
      console.error("[ShareLeituras] share:", e);
      if (e?.name !== "AbortError") toast.error("Falha: " + (e?.message ?? "erro"));
    } finally { setBusy(null); }
  }

  const canShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Leituras</DialogTitle>
          <DialogDescription className="text-xs">
            Imagem 1080×1920 gerada a partir do período selecionado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="rounded-xl overflow-hidden shadow-elevated bg-muted/30"
            style={{ width: SHARE_SIZE.w * scale, height: SHARE_SIZE.h * scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SHARE_SIZE.w, height: SHARE_SIZE.h }}>
              <MinhasLeiturasShareCard
                ref={ref}
                nome={nome}
                periodoLabel={periodoLabel}
                stats={stats}
                capasResolvidas={capas}
                logoSrc={logoData ?? logoNamzu}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {canShare && (
              <Button onClick={handleShare} disabled={!!busy || preparing} className="rounded-xl">
                {busy === "share" || preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {preparing ? "Preparando…" : "Compartilhar"}
              </Button>
            )}
            <Button onClick={handleDownload} disabled={!!busy || preparing} variant="outline" className="rounded-xl">
              {busy === "download" || preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {preparing ? "Preparando…" : "Baixar imagem"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
