import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Share2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CitacaoCard, CitacaoTema, CARD_W, CARD_H } from "./CitacaoCard";
import type { Citacao } from "@/hooks/useCitacoes";
import { cn } from "@/lib/utils";

const TEMAS: { key: CitacaoTema; label: string; bg: string; ring: string }[] = [
  { key: "papel", label: "Papel",  bg: "#F7F3EC", ring: "#C4A882" },
  { key: "mint",  label: "Mint",   bg: "#D1F2E5", ring: "#1A3B8B" },
  { key: "ink",   label: "Ink",    bg: "#12263F", ring: "#88B4D8" },
];

// Display size: card shown at 300px wide inside modal
const DISPLAY_W = 300;
const scale = DISPLAY_W / CARD_W;
const DISPLAY_H = Math.round(CARD_H * scale);

interface Props {
  citacao: Citacao | null;
  open: boolean;
  onClose: () => void;
}

export function CitacaoShareModal({ citacao, open, onClose }: Props) {
  const [tema, setTema] = useState<CitacaoTema>("papel");
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!citacao) return null;

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 1,
        // Inline Google Fonts so they render in the PNG
        fetchRequestInit: { cache: "force-cache" },
      });

      // Mobile: Web Share API with file
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare
      ) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "citacao-namzu.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Citação · Namzu" });
          return;
        }
      }

      // Desktop: download PNG
      const link = document.createElement("a");
      link.download = `citacao-namzu-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem salva!");
    } catch {
      toast.error("Erro ao exportar imagem.");
    } finally {
      setExporting(false);
    }
  };

  const canNativeShare =
    typeof navigator !== "undefined" &&
    !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden rounded-3xl gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">
            Compartilhar citação
          </DialogTitle>
        </DialogHeader>

        {/* Card preview — clipped to display size */}
        <div className="px-5 pb-3">
          <div
            style={{
              width: DISPLAY_W,
              height: DISPLAY_H,
              overflow: "hidden",
              borderRadius: 10,
              flexShrink: 0,
              position: "relative",
            }}
            className="mx-auto shadow-soft"
          >
            {/* Transform wrapper — scales the native-size card down */}
            <div
              style={{
                width: CARD_W,
                height: CARD_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
            >
              <CitacaoCard ref={cardRef} citacao={citacao} tema={tema} />
            </div>
          </div>
        </div>

        {/* Theme selector */}
        <div className="px-5 py-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Tema:</span>
          {TEMAS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTema(t.key)}
              title={t.label}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all duration-150",
                tema === t.key
                  ? "ring-2 ring-offset-2 ring-primary scale-110"
                  : "opacity-60 hover:opacity-100"
              )}
              style={{ background: t.bg, borderColor: t.ring }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 pt-2 pb-5 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-11"
          >
            <X className="w-4 h-4 mr-1.5" />
            Fechar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 rounded-xl h-11 bg-primary hover:bg-primary-hover"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-1.5" />
            )}
            {canNativeShare ? "Compartilhar" : "Baixar PNG"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
