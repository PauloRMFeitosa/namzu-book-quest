import { useState } from "react";
import { Sparkles, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMatchmakingIA } from "@/hooks/clubes/useClubeAI";

export const MatchmakingIA = ({ clubeId }: { clubeId: string }) => {
  const [open, setOpen] = useState(false);
  const m = useMatchmakingIA();

  const trigger = () => {
    setOpen(true);
    if (!m.data) m.mutate(clubeId);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={trigger}
        className="rounded-xl gap-1.5 text-xs h-8"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" /> Encontrar afinidades
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" /> Almas próximas neste clube
            </DialogTitle>
            <DialogDescription>
              Pessoas que valem uma conversa, segundo a IA.
            </DialogDescription>
          </DialogHeader>
          {m.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Procurando…
            </div>
          )}
          {m.data && (
            <ul className="flex flex-col gap-2">
              {m.data.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma afinidade clara encontrada por enquanto.
                </p>
              ) : (
                m.data.matches.map((p) => (
                  <li
                    key={p.user_id}
                    className="p-3 rounded-xl bg-muted/40 border border-border/40"
                  >
                    <p className="text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {p.motivo}
                    </p>
                  </li>
                ))
              )}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
