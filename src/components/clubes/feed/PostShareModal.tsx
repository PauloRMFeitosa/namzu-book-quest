import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { CitacaoTema, CARD_W, CARD_H } from "@/components/CitacaoCard";
import { PostShareCard } from "./PostShareCard";
import { supabase } from "@/integrations/supabase/client";
import { imageToDataUrl, preloadImage } from "@/lib/imageToDataUrl";
import type { FeedPost } from "@/hooks/clubes/useFeed";
import { cn } from "@/lib/utils";

const TEMAS: { key: CitacaoTema; label: string; bg: string; ring: string }[] = [
  { key: "papel", label: "Papel",  bg: "#F7F3EC", ring: "#C4A882" },
  { key: "mint",  label: "Mint",   bg: "#D1F2E5", ring: "#1A3B8B" },
  { key: "ink",   label: "Ink",    bg: "#12263F", ring: "#88B4D8" },
];

// Tamanho de exibição: card mostrado com 300px de largura dentro do modal
const DISPLAY_W = 300;
const scale = DISPLAY_W / CARD_W;
const DISPLAY_H = Math.round(CARD_H * scale);

interface Props {
  post: FeedPost | null;
  open: boolean;
  onClose: () => void;
}

export function PostShareModal({ post, open, onClose }: Props) {
  const [tema, setTema] = useState<CitacaoTema>("papel");
  const [exporting, setExporting] = useState(false);
  const [imagemDataUrl, setImagemDataUrl] = useState<string | null>(null);
  const [resolvendoImagem, setResolvendoImagem] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: clubeNome } = useQuery({
    queryKey: ["clube-nome", post?.clube_id],
    enabled: open && !!post?.clube_id,
    queryFn: async () => {
      const { data } = await supabase.from("clubes").select("nome").eq("id", post!.clube_id).single();
      return data?.nome ?? null;
    },
  });

  // Pré-resolve a imagem do post em data URL (evita problemas de CORS na captura)
  useEffect(() => {
    let cancelled = false;
    if (!open || !post?.imagem_url) {
      setImagemDataUrl(null);
      return;
    }
    setResolvendoImagem(true);
    setImagemDataUrl(null);
    imageToDataUrl(post.imagem_url)
      .then(async (durl) => {
        if (cancelled) return;
        if (durl) await preloadImage(durl);
        if (!cancelled) setImagemDataUrl(durl);
      })
      .finally(() => !cancelled && setResolvendoImagem(false));
    return () => {
      cancelled = true;
    };
  }, [open, post?.imagem_url]);

  if (!post) return null;

  const autorNome = post.autor?.nome_exibicao || post.autor?.username || "Membro";

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 1,
        fetchRequestInit: { cache: "force-cache" },
      });

      // Mobile: Web Share API com arquivo
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare
      ) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "publicacao-namzu.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Publicação · Namzu" });
          return;
        }
      }

      // Desktop: download do PNG
      const link = document.createElement("a");
      link.download = `publicacao-namzu-${Date.now()}.png`;
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
            Compartilhar publicação
          </DialogTitle>
        </DialogHeader>

        {/* Preview do card — recortado no tamanho de exibição */}
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
            {/* Wrapper de transform — reduz o card em tamanho nativo */}
            <div
              style={{
                width: CARD_W,
                height: CARD_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
            >
              <PostShareCard
                ref={cardRef}
                texto={post.conteudo}
                autorNome={autorNome}
                clubeNome={clubeNome}
                criadoEm={post.created_at}
                imagemDataUrl={imagemDataUrl}
                tema={tema}
              />
            </div>
          </div>
        </div>

        {/* Seletor de tema */}
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

        {/* Ações */}
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
            disabled={exporting || resolvendoImagem}
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
