import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Heart, MessageCircle, Sparkles, Loader2, Trash2, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurtirPost, useRespostasPost, useExcluirPost, type FeedPost } from "@/hooks/clubes/useFeed";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { PerguntasProfundasButton } from "@/components/clubes/ai/PerguntasProfundasButton";
import { PostComposer } from "./PostComposer";
import { PostShareModal } from "./PostShareModal";

interface Props {
  post: FeedPost;
  clubeId: string;
  isMembro?: boolean;
  isReply?: boolean;
  curadorId?: string;
  canManage?: boolean;
}

export const PostCard = ({ post, clubeId, isMembro = true, isReply, curadorId, canManage }: Props) => {
  const { user } = useAuth();
  const curtir = useCurtirPost(clubeId);
  const excluir = useExcluirPost(clubeId);
  const [openRespostas, setOpenRespostas] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const respostas = useRespostasPost(post.id, openRespostas);

  const isOwn = !!user && user.id === post.user_id;
  const isCurador = !!user && !!curadorId && user.id === curadorId;
  const canDelete = isOwn || isCurador || !!canManage;

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
        isReply ? "p-3 border-l-2 border-border/40 ml-2" : "card-soft p-4 border",
        !isReply && (post.is_destaque_curador
          ? "border-accent/50 bg-accent/5"
          : "border-border/60 hover:border-border"),
      )}
    >
      {post.is_destaque_curador && !isReply && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-wider font-semibold text-accent">
          <Sparkles className="w-3 h-3" /> Destaque do curador
        </div>
      )}

      <header className="flex items-center gap-3 mb-3">
        <Avatar className={cn("border border-border", isReply ? "w-7 h-7" : "w-9 h-9")}>
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

      {post.conteudo && (
        <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed [&_p]:my-2 [&_a]:text-primary [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-3 [&_blockquote]:italic">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.conteudo}</ReactMarkdown>
        </div>
      )}

      {post.imagem_url && (
        <div className="mt-2">
          <img
            src={post.imagem_url}
            alt=""
            loading="lazy"
            className="rounded-lg border border-border/40 max-h-96 w-full object-cover"
          />
        </div>
      )}

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
          <Heart className={cn("w-3.5 h-3.5", post.curtido_por_mim && "fill-current")} />
          {post.curtidas_count}
        </button>
        {!isReply && (
          <button
            onClick={() => setOpenRespostas((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              openRespostas ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {post.respostas_count}
          </button>
        )}
        {!isReply && <PerguntasProfundasButton postId={post.id} />}
        {!isReply && (
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            title="Compartilhar publicação"
            aria-label="Compartilhar publicação"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Excluir post"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir este post?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O post e todos os comentários serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => excluir.mutate(post.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {excluir.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </footer>

      <AnimatePresence>
        {openRespostas && !isReply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/40 flex flex-col gap-3">
              {respostas.isLoading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                (respostas.data ?? []).map((r) => (
                  <PostCard key={r.id} post={r} clubeId={clubeId} isMembro={isMembro} isReply />
                ))
              )}
              <PostComposer
                clubeId={clubeId}
                isMembro={isMembro}
                parentPostId={post.id}
                compact
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isReply && (
        <PostShareModal
          post={post}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </motion.article>
  );
};
