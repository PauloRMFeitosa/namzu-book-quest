import { ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type EmbedInfo =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "direct"; url: string };

export function getVideoEmbed(url: string): EmbedInfo | null {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id: string | null = null;
      if (u.hostname.includes("youtu.be")) {
        id = u.pathname.slice(1).split("?")[0];
      } else if (u.searchParams.get("v")) {
        id = u.searchParams.get("v");
      } else if (u.pathname.includes("/embed/")) {
        id = u.pathname.split("/embed/")[1].split("?")[0];
      } else if (u.pathname.includes("/shorts/")) {
        id = u.pathname.split("/shorts/")[1].split("?")[0];
      }
      if (id) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` };
    }

    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1` };
    }

    // Arquivo de vídeo direto
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(u.pathname)) {
      return { kind: "direct", url };
    }
  } catch {}

  return null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  url: string;
}

export const VideoPlayerDialog = ({ open, onOpenChange, titulo, url }: Props) => {
  const embed = getVideoEmbed(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden bg-black border-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/90">
          <span className="text-white text-sm font-medium truncate pr-4">{titulo}</span>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
              title="Abrir no site original"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => onOpenChange(false)}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" /* 16:9 */ }}>
          {embed?.kind === "direct" ? (
            <video
              src={embed.url}
              controls
              autoPlay
              className="absolute inset-0 w-full h-full bg-black"
            />
          ) : embed ? (
            <iframe
              src={embed.embedUrl}
              title={titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            // URL não embutível — fallback
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 bg-black">
              <p className="text-sm">Não foi possível embutir este vídeo.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm underline underline-offset-2 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" /> Abrir no site original
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
