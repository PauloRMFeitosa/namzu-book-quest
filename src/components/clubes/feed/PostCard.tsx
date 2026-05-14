import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurtirPost, type FeedPost } from "@/hooks/clubes/useFeed";
import { cn } from "@/lib/utils";
import { PerguntasProfundasButton } from "@/components/clubes/ai/PerguntasProfundasButton";

interface Props {
  post: FeedPost;
  clubeId: string;
}

export const PostCard = ({ post, clubeId }: Props) => {
  const curtir = useCurtirPost(clubeId);
  const nome = post.autor?.nome_exibicao || post.autor?.username || "Membro";
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "card-soft p-4 border transition-all",
        post.is_destaque_curador
          ? "border-accent/50 bg-accent/5"
          : "border-border/60 hover:border-border",
      )}
    >
      {post.is_destaque_curador && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-wider font-semibold text-accent">
          <Sparkles className="w-3 h-3" /> Destaque do curador
        </div>
      )}

      <header className="flex items-center gap-3 mb-3">
        <Avatar className="w-9 h-9 border border-border">
          <AvatarImage src={post.autor?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-secondary text-xs">{initials || "M"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{nome}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </header>

      <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed [&_p]:my-2 [&_a]:text-primary [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-3 [&_blockquote]:italic">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.conteudo}</ReactMarkdown>
      </div>

      <footer className="flex items-center gap-1 pt-3 mt-3 border-t border-border/40">
        <button
          onClick={() => curtir.mutate({ postId: post.id, curtido: post.curtido_por_mim })}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
            post.curtido_por_mim
              ? "text-destructive bg-destructive/10"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Heart
            className={cn("w-3.5 h-3.5", post.curtido_por_mim && "fill-current")}
          />
          {post.curtidas_count}
        </button>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
          <MessageCircle className="w-3.5 h-3.5" />
          {post.respostas_count}
        </button>
        <PerguntasProfundasButton postId={post.id} />
      </footer>
    </motion.article>
  );
};
