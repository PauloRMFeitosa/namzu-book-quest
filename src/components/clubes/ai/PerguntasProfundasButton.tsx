import { useState } from "react";
import { Sparkles, Loader2, MessageCircleQuestion } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePerguntasProfundasIA } from "@/hooks/clubes/useClubeAI";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const PerguntasProfundasButton = ({ postId }: { postId: string }) => {
  const [open, setOpen] = useState(false);
  const m = usePerguntasProfundasIA();
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  if (!isAdmin && !flags.show_clube_ai_provocacao) return null;

  const trigger = () => {
    setOpen(true);
    if (!m.data) m.mutate({ post_id: postId });
  };

  return (
    <>
      <button
        onClick={trigger}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        title="Provocar discussão (IA)"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        Provocar
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <MessageCircleQuestion className="w-4 h-4 text-accent" /> Perguntas profundas
            </DialogTitle>
            <DialogDescription>
              Use uma delas para destravar a conversa.
            </DialogDescription>
          </DialogHeader>
          {m.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Pensando…
            </div>
          )}
          {m.data && (
            <ul className="flex flex-col gap-2 mt-2">
              {m.data.perguntas.map((p, i) => (
                <li
                  key={i}
                  className="p-3 rounded-xl bg-muted/50 border border-border/40 text-sm leading-relaxed"
                >
                  {p}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
