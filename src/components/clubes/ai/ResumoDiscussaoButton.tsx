import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useResumoDiscussaoIA } from "@/hooks/clubes/useClubeAI";

export const ResumoDiscussaoButton = ({ clubeId }: { clubeId: string }) => {
  const [open, setOpen] = useState(false);
  const m = useResumoDiscussaoIA();

  const onOpen = (v: boolean) => {
    setOpen(v);
    if (v && !m.data) m.mutate(clubeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs h-8">
          <Sparkles className="w-3.5 h-3.5 text-accent" /> Resumo IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Síntese da discussão
          </DialogTitle>
          <DialogDescription>
            O que a IA leu nos posts recentes deste clube.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {m.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Sintetizando…
            </div>
          )}
          {m.data && (
            <div className="prose prose-sm max-w-none [&_h2]:font-display [&_h3]:font-display">
              <ReactMarkdown>{m.data.texto}</ReactMarkdown>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
