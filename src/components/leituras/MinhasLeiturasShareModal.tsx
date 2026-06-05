import { useRef, useState, useMemo } from "react";
import { toPng } from "html-to-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MinhasLeiturasShareCard, SHARE_SIZE } from "./MinhasLeiturasShareCard";
import { EstatisticasPeriodo } from "@/hooks/leituras/useMinhasLeituras";

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

  const scale = useMemo(() => Math.min(320 / SHARE_SIZE.w, 540 / SHARE_SIZE.h), []);

  async function generatePng(): Promise<Blob> {
    if (!ref.current) throw new Error("Card não renderizado");
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch {}
    }
    const imgs = Array.from(ref.current.querySelectorAll("img"));
    await Promise.all(imgs.map((img) => new Promise<void>((r) => {
      if (img.complete && img.naturalWidth > 0) return r();
      img.addEventListener("load", () => r(), { once: true });
      img.addEventListener("error", () => r(), { once: true });
    })));
    await new Promise((r) => setTimeout(r, 50));
    const url = await toPng(ref.current, { pixelRatio: 1, cacheBust: true, width: SHARE_SIZE.w, height: SHARE_SIZE.h });
    return await (await fetch(url)).blob();
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
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada");
    } catch (e: any) {
      toast.error("Falha: " + (e?.message ?? ""));
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
      if (e?.name !== "AbortError") toast.error("Falha: " + (e?.message ?? ""));
    } finally { setBusy(null); }
  }

  const canShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Leituras</DialogTitle>
          <DialogDescription className="text-xs">
            Imagem gerada a partir do período selecionado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="rounded-xl overflow-hidden shadow-elevated bg-muted/30"
            style={{ width: SHARE_SIZE.w * scale, height: SHARE_SIZE.h * scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SHARE_SIZE.w, height: SHARE_SIZE.h }}>
              <MinhasLeiturasShareCard ref={ref} nome={nome} periodoLabel={periodoLabel} stats={stats} />
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {canShare && (
              <Button onClick={handleShare} disabled={!!busy} className="rounded-xl">
                {busy === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Compartilhar
              </Button>
            )}
            <Button onClick={handleDownload} disabled={!!busy} variant="outline" className="rounded-xl">
              {busy === "download" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Baixar imagem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
