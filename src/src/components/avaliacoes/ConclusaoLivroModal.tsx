import { useState } from "react";
import { BookOpen, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvaliacaoModal } from "@/components/avaliacoes/AvaliacaoModal";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  usuarioLivroId: string;
  titulo: string;
  capaUrl?: string | null;
}

/**
 * Modal exibido imediatamente após marcar um livro como "lido".
 * Convida o usuário a avaliar sem obrigar — PENDENTE fica registrado no banco.
 */
export const ConclusaoLivroModal = ({ open, onOpenChange, usuarioLivroId, titulo, capaUrl }: Props) => {
  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false);

  const avaliarAgora = () => {
    onOpenChange(false);
    setAvaliacaoOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center">
            <div className="text-4xl mb-1">🎉</div>
            <DialogTitle className="text-center">Parabéns!</DialogTitle>
            <DialogDescription className="text-center">
              Você concluiu <span className="font-semibold text-foreground">"{titulo}"</span>
            </DialogDescription>
          </DialogHeader>

          {/* Capa */}
          <div className="flex justify-center my-2">
            {capaUrl ? (
              <img src={capaUrl} alt="" className="w-20 h-28 rounded-xl object-cover shadow-elevated" />
            ) : (
              <div className="w-20 h-28 rounded-xl bg-secondary flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">O que você achou deste livro?</p>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={avaliarAgora}
              className="w-full bg-primary hover:bg-primary-hover h-11 rounded-2xl"
            >
              <Star className="w-4 h-4" /> Avaliar agora
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full text-muted-foreground"
            >
              Avaliar depois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AvaliacaoModal
        open={avaliacaoOpen}
        onOpenChange={setAvaliacaoOpen}
        usuarioLivroId={usuarioLivroId}
        titulo={titulo}
        capaUrl={capaUrl}
      />
    </>
  );
};
