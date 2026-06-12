import { useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Send, Eye, Pencil, ImagePlus, Camera, Images, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCriarPost } from "@/hooks/clubes/useFeed";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "Clubes";

const isHeic = (file: File) =>
  /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

const convertHeicToJpeg = async (file: File): Promise<File> => {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
};

/** Redimensiona para max 1200px e retorna um Blob JPEG */
const resizeToBlob = (file: File, maxPx = 1200, quality = 0.82): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas indisponível")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Falha ao gerar blob")),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao carregar imagem")); };
    img.src = url;
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
  // Preview local (object URL) — apenas para exibição antes do envio
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);
  // Arquivo processado pronto para upload
  const [fileParaUpload, setFileParaUpload] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
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
    if (!file || parentPostId) return;
    const isImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!isImage) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Imagem máxima de 20MB"); return; }

    setUploading(true);
    // Limpa preview anterior
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setPreviewLocal(null);
    setFileParaUpload(null);

    try {
      const source = isHeic(file) ? await convertHeicToJpeg(file) : file;
      const blob = await resizeToBlob(source);
      const objUrl = URL.createObjectURL(blob);
      setPreviewLocal(objUrl);
      setFileParaUpload(blob);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível processar esta foto");
    } finally {
      setUploading(false);
    }
  };

  const removerImagem = () => {
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setPreviewLocal(null);
    setFileParaUpload(null);
  };

  const submit = async () => {
    const texto = conteudo.trim();
    if (!texto && !fileParaUpload) return;

    let imagemUrl: string | null = null;

    // Faz upload para o bucket Clubes se tiver imagem
    if (fileParaUpload) {
      const ext = "jpg";
      const path = `feed/${clubeId}/${user.id}/${Date.now()}.${ext}`;
      const { data: uploaded, error: errUpload } = await supabase.storage
        .from(BUCKET)
        .upload(path, fileParaUpload, { contentType: "image/jpeg", upsert: false });
      if (errUpload) { toast.error(`Erro ao enviar imagem: ${errUpload.message}`); return; }
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path);
      imagemUrl = publicUrl;
    }

    await criar.mutateAsync({
      conteudo: texto,
      parent_post_id: parentPostId ?? null,
      imagem_url: imagemUrl,
    });

    setConteudo("");
    removerImagem();
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{conteudo}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground text-sm m-0">Nada para visualizar…</p>
              )}
            </div>
          ) : (
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder={
                parentPostId
                  ? "Escreva um comentário…"
                  : "Compartilhe uma reflexão… (Markdown suportado)"
              }
              rows={compact ? 2 : 3}
              className="resize-none border-border/60 focus-visible:ring-primary/40"
            />
          )}

          {/* Preview local da imagem */}
          {previewLocal && (
            <div className="relative w-full max-w-xs">
              <img
                src={previewLocal}
                alt="Preview"
                className="rounded-lg border border-border/40 max-h-48 object-cover w-full"
              />
              <button
                type="button"
                onClick={removerImagem}
                className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow"
                aria-label="Remover imagem"
              >
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                Storage
              </span>
            </div>
          )}

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1">
              {!parentPostId && (
                <>
                  {isMobile ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => cameraRef.current?.click()}
                        disabled={uploading || criar.isPending}
                        className="text-xs gap-1.5 h-8"
                      >
                        {uploading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Camera className="w-3.5 h-3.5" />}
                        Câmera
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => galleryRef.current?.click()}
                        disabled={uploading || criar.isPending}
                        className="text-xs gap-1.5 h-8"
                      >
                        <Images className="w-3.5 h-3.5" />
                        Galeria
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => galleryRef.current?.click()}
                      disabled={uploading || criar.isPending}
                      className="text-xs gap-1.5 h-8"
                    >
                      {uploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <ImagePlus className="w-3.5 h-3.5" />}
                      Imagem
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreview((v) => !v)}
                    className="text-xs gap-1.5 h-8"
                    title={preview ? "Editar" : "Pré-visualizar"}
                  >
                    {preview
                      ? <Pencil className="w-3.5 h-3.5" />
                      : <Eye className="w-3.5 h-3.5" />}
                    {preview ? "Editar" : "Preview"}
                  </Button>
                </>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={criar.isPending || uploading || (!conteudo.trim() && !fileParaUpload)}
              className="rounded-xl gap-1.5 bg-primary hover:bg-primary-hover"
            >
              {criar.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              {parentPostId ? "Comentar" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
