import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, Link2, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { imageToDataUrl, preloadImage } from "@/lib/imageToDataUrl";
import {
  ShareCard,
  ShareData,
  ShareFormat,
  ShareStyle,
  ShareTemplate,
  FORMAT_SIZES,
} from "./ShareCards";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: Omit<ShareData, "link"> & { link?: string };
  /** Templates disponíveis — default todos */
  templates?: ShareTemplate[];
  defaultTemplate?: ShareTemplate;
}

const TEMPLATES: { id: ShareTemplate; label: string }[] = [
  { id: "recommend", label: "Recomendo" },
  { id: "reading", label: "Estou lendo" },
  { id: "completed", label: "Concluí" },
];

const STYLES: { id: ShareStyle; label: string }[] = [
  { id: "light", label: "Claro" },
  { id: "dark", label: "Escuro" },
  { id: "gradient", label: "Gradiente" },
  { id: "cover", label: "Premium" },
];

export const ShareModal = ({ open, onOpenChange, data, templates, defaultTemplate }: ShareModalProps) => {
  const allowed = templates ?? ["recommend", "reading", "completed"];
  const [template, setTemplate] = useState<ShareTemplate>(defaultTemplate ?? allowed[0]);
  const [format, setFormat] = useState<ShareFormat>("square");
  const [style, setStyle] = useState<ShareStyle>("light");
  const [comentario, setComentario] = useState(data.comentario ?? "");
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [capaResolved, setCapaResolved] = useState<string | null>(null);
  const [resolvingCapa, setResolvingCapa] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTemplate(defaultTemplate ?? allowed[0]);
      setComentario(data.comentario ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pré-resolve a capa em dataURL (evita problemas de CORS na captura)
  useEffect(() => {
    let cancelled = false;
    if (!open) return;
    const src = data.capaUrl;
    if (!src) {
      setCapaResolved(null);
      return;
    }
    if (src.startsWith("data:")) {
      setCapaResolved(src);
      return;
    }
    setResolvingCapa(true);
    setCapaResolved(null);
    imageToDataUrl(src)
      .then(async (durl) => {
        if (cancelled) return;
        if (durl) await preloadImage(durl);
        if (!cancelled) setCapaResolved(durl);
      })
      .finally(() => !cancelled && setResolvingCapa(false));
    return () => {
      cancelled = true;
    };
  }, [open, data.capaUrl]);

  const link = data.link ?? (typeof window !== "undefined" ? window.location.href : "");
  const fullData: ShareData = { ...data, capaUrl: capaResolved ?? data.capaUrl, comentario, link };

  const size = FORMAT_SIZES[format];
  const maxPreviewW = 320;
  const maxPreviewH = 480;
  const scale = useMemo(
    () => Math.min(maxPreviewW / size.w, maxPreviewH / size.h),
    [size.w, size.h],
  );

  async function generatePng(): Promise<Blob | null> {
    if (!cardRef.current) {
      throw new Error("Card não renderizado");
    }
    // Aguarda fontes carregarem
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch {}
    }
    // Aguarda imagens internas
    const imgs = Array.from(cardRef.current.querySelectorAll("img"));
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

    // Pequeno delay para garantir layout
    await new Promise((r) => setTimeout(r, 50));

    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 1,
      cacheBust: true,
      width: size.w,
      height: size.h,
      skipFonts: false,
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  async function handleDownload() {
    try {
      setBusy("download");
      const blob = await generatePng();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `namzu-${template}-${format}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada");
    } catch (e: any) {
      console.error("[ShareModal] download:", e);
      toast.error("Falha ao gerar imagem: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    try {
      setBusy("share");
      const blob = await generatePng();
      if (!blob) return;
      const file = new File([blob], `namzu-${template}.png`, { type: "image/png" });
      const navAny = navigator as any;
      const shareData: any = {
        title: fullData.titulo,
        text: `${fullData.titulo}${fullData.autor ? ` — ${fullData.autor}` : ""}\n${link}`,
        url: link,
        files: [file],
      };
      if (navAny.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        await navigator.share({ title: shareData.title, text: shareData.text, url: link });
      } else {
        await handleDownload();
      }
    } catch (e: any) {
      console.error("[ShareModal] share:", e);
      if (e?.name !== "AbortError") toast.error("Falha ao compartilhar: " + (e?.message ?? ""));
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function handleCopyImage() {
    try {
      const blob = await generatePng();
      if (!blob) return;
      // @ts-ignore
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Imagem copiada");
    } catch {
      toast.error("Cópia de imagem não suportada");
    }
  }

  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const canNativeShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar</DialogTitle>
          <DialogDescription className="text-xs">
            Escolha o modelo, formato e estilo. A imagem é gerada na hora.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="rounded-xl overflow-hidden shadow-elevated bg-muted/30"
              style={{ width: size.w * scale, height: size.h * scale }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: size.w, height: size.h }}>
                <ShareCard ref={cardRef} data={fullData} template={template} format={format} style={style} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{size.w}×{size.h}</p>
          </div>

          {/* Controles */}
          <div className="flex flex-col gap-4">
            {allowed.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Modelo</Label>
                <Tabs value={template} onValueChange={(v) => setTemplate(v as ShareTemplate)}>
                  <TabsList className="w-full">
                    {TEMPLATES.filter((t) => allowed.includes(t.id)).map((t) => (
                      <TabsTrigger key={t.id} value={t.id} className="flex-1 text-xs">{t.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Formato</Label>
              <Tabs value={format} onValueChange={(v) => setFormat(v as ShareFormat)}>
                <TabsList className="w-full flex-wrap h-auto">
                  {(Object.keys(FORMAT_SIZES) as ShareFormat[]).map((f) => (
                    <TabsTrigger key={f} value={f} className="flex-1 text-[10px]">{FORMAT_SIZES[f].label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Estilo</Label>
              <Tabs value={style} onValueChange={(v) => setStyle(v as ShareStyle)}>
                <TabsList className="w-full">
                  {STYLES.map((s) => (
                    <TabsTrigger key={s.id} value={s.id} className="flex-1 text-xs">{s.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Comentário (opcional)</Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, 180))}
                placeholder="Adicione um comentário pessoal…"
                className="resize-none"
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground text-right">{comentario.length}/180</p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {(isMobile || canNativeShare) && (
                <Button onClick={handleShare} disabled={!!busy || resolvingCapa} className="rounded-xl">
                  {busy === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  Compartilhar
                </Button>
              )}
              <Button onClick={handleDownload} disabled={!!busy || resolvingCapa} variant="outline" className="rounded-xl">
                {busy === "download" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Baixar imagem
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleCopyImage} variant="outline" size="sm" className="rounded-xl">
                  <Copy className="w-3 h-3" /> Copiar imagem
                </Button>
                <Button onClick={handleCopyLink} variant="outline" size="sm" className="rounded-xl">
                  <Link2 className="w-3 h-3" /> Copiar link
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Render escondido em escala real para captura (toPng usa o ref do preview escalado, mas com width/height nativos do card original — o ref aponta para o ShareCard renderizado em tamanho real dentro do contêiner escalado, mantendo as dimensões originais). */}
      </DialogContent>
    </Dialog>
  );
};
