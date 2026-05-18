import { useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Send, Eye, Pencil, ImagePlus, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCriarPost } from "@/hooks/clubes/useFeed";

const markdownUrlTransform = (value: string) =>
  /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) ? value : defaultUrlTransform(value);

const isHeic = (file: File) =>
  /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

const convertHeicToJpegFile = async (file: File): Promise<File> => {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
};

const imageFileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const maxSize = 1200;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível preparar a imagem"));
        return;
      }

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível carregar esta imagem"));
    };

    img.src = objectUrl;
  });

interface Props {
  clubeId: string;
  isMembro: boolean;
  parentPostId?: string | null;
  compact?: boolean;
  onDone?: () => void;
}

export const PostComposer = ({ clubeId, isMembro, parentPostId, compact, onDone }: Props) => {
  const { user } = useAuth();
  const [conteudo, setConteudo] = useState("");
  const [preview, setPreview] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const criar = useCriarPost(clubeId);

  if (!user || !isMembro) {
    if (compact) return null;
    return (
      <div className="card-soft p-5 border border-dashed border-border/60 text-center text-sm text-muted-foreground">
        Entre no clube para participar do feed.
      </div>
    );
  }

  const handleFile = async (file: File | null) => {
    if (!file || !user) return;
    if (parentPostId) return;
    const isImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!isImage) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Imagem máxima de 25MB");
      return;
    }
    setUploading(true);
    try {
      const source = isHeic(file) ? await convertHeicToJpegFile(file) : file;
      setImagemUrl(await imageFileToDataUrl(source));
    } catch (e: any) {
      console.error("[PostComposer] erro imagem:", e, { name: file.name, type: file.type, size: file.size });
      toast.error(e?.message ?? "Não foi possível processar esta foto. Tente outra.");
    } finally {
      setUploading(false);
    }
  };

  const postContent = parentPostId || !imagemUrl
    ? conteudo
    : `${conteudo.trim()}\n\n![Imagem do post](${imagemUrl})`;

  const submit = async () => {
    if (!postContent.trim()) return;
    await criar.mutateAsync({
      conteudo: postContent,
      parent_post_id: parentPostId ?? null,
    });
    setConteudo("");
    setImagemUrl(null);
    setPreview(false);
    onDone?.();
  };

  const initials = (user.email ?? "U")[0]?.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={compact ? "" : "card-soft p-4 border border-border/60"}
    >
      <div className="flex gap-3">
        {!compact && (
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={(user.user_metadata as any)?.avatar_url} />
            <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {preview ? (
            <div className="prose prose-sm max-w-none min-h-[80px] px-3 py-2 rounded-md bg-muted/30 border border-border/40">
              {conteudo.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>{conteudo}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground text-sm m-0">Nada para visualizar…</p>
              )}
            </div>
          ) : (
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder={parentPostId ? "Escreva um comentário…" : "Compartilhe uma reflexão… (Markdown suportado)"}
              rows={compact ? 2 : 3}
              className="resize-none border-border/60 focus-visible:ring-primary/40"
            />
          )}

          {imagemUrl && (
            <div className="relative w-full max-w-xs">
              <img src={imagemUrl} alt="" className="rounded-lg border border-border/40 max-h-48 object-cover" />
              <button
                type="button"
                onClick={() => setImagemUrl(null)}
                className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow"
                aria-label="Remover imagem"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1">
              {!parentPostId && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => galleryRef.current?.click()}
                    disabled={uploading}
                    className="text-xs gap-1.5 h-8"
                    aria-label="Galeria"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                    Galeria
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => cameraRef.current?.click()}
                    disabled={uploading}
                    className="text-xs gap-1.5 h-8"
                    aria-label="Câmera"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Câmera
                  </Button>
                </>
              )}
              {!parentPostId && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreview((p) => !p)}
                  className="text-xs gap-1.5 h-8"
                >
                  {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {preview ? "Editar" : "Preview"}
                </Button>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={criar.isPending || uploading || (!conteudo.trim() && !imagemUrl)}
              className="rounded-xl gap-1.5 bg-primary hover:bg-primary-hover"
            >
              {criar.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {parentPostId ? "Comentar" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
