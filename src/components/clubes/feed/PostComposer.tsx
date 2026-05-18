import { useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Send, Eye, Pencil, ImagePlus, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCriarPost } from "@/hooks/clubes/useFeed";
import { supabase } from "@/integrations/supabase/client";

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
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem máxima de 8MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("post-imagens")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("post-imagens").getPublicUrl(path);
      setImagemUrl(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!conteudo.trim() && !imagemUrl) return;
    await criar.mutateAsync({
      conteudo,
      parent_post_id: parentPostId ?? null,
      imagem_url: imagemUrl,
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{conteudo}</ReactMarkdown>
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
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
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
