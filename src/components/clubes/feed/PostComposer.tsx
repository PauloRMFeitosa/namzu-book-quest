import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Send, Eye, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCriarPost } from "@/hooks/clubes/useFeed";

interface Props {
  clubeId: string;
  isMembro: boolean;
}

export const PostComposer = ({ clubeId, isMembro }: Props) => {
  const { user } = useAuth();
  const [conteudo, setConteudo] = useState("");
  const [preview, setPreview] = useState(false);
  const criar = useCriarPost(clubeId);

  if (!user || !isMembro) {
    return (
      <div className="card-soft p-5 border border-dashed border-border/60 text-center text-sm text-muted-foreground">
        Entre no clube para participar do feed.
      </div>
    );
  }

  const submit = async () => {
    if (!conteudo.trim()) return;
    await criar.mutateAsync({ conteudo });
    setConteudo("");
    setPreview(false);
  };

  const initials = (user.email ?? "U")[0]?.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-soft p-4 border border-border/60"
    >
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={(user.user_metadata as any)?.avatar_url} />
          <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
        </Avatar>
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
              placeholder="Compartilhe uma reflexão, citação ou pergunta… (Markdown suportado)"
              rows={3}
              className="resize-none border-border/60 focus-visible:ring-primary/40"
            />
          )}
          <div className="flex items-center justify-between">
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
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={criar.isPending || !conteudo.trim()}
              className="rounded-xl gap-1.5 bg-primary hover:bg-primary-hover"
            >
              {criar.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Publicar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
