import { Copy, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { linkConvite, mensagemConvite } from "@/lib/convite";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubeId: string;
  nomeClube: string;
  privado?: boolean;
  /** Abre logo depois de criar o clube, com o texto de boas-vindas. */
  recemCriado?: boolean;
}

export const ConvidarMembrosDialog = ({ open, onOpenChange, clubeId, nomeClube, privado, recemCriado }: Props) => {
  const link = linkConvite(clubeId);
  const mensagem = mensagemConvite(nomeClube, link);
  const podeCompartilhar = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  };

  const compartilhar = async () => {
    try {
      await navigator.share({ title: nomeClube, text: mensagem, url: link });
    } catch {
      /* usuário fechou a folha de compartilhamento */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{recemCriado ? "Clube criado! Convide seus membros" : "Convidar membros"}</DialogTitle>
          <DialogDescription>
            Envie este link. Quem abrir vê o clube e entra com um cadastro rápido.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={link}
              aria-label="Link de convite"
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 rounded-xl text-xs"
            />
            <Button onClick={copiar} className="h-11 rounded-xl gap-1.5 bg-primary hover:bg-primary-hover shrink-0">
              <Copy className="w-4 h-4" /> Copiar
            </Button>
          </div>

          <Button asChild variant="outline" className="h-11 rounded-xl gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" /> Enviar pelo WhatsApp
            </a>
          </Button>

          {podeCompartilhar && (
            <Button variant="outline" onClick={compartilhar} className="h-11 rounded-xl gap-2">
              <Share2 className="w-4 h-4" /> Outras formas de compartilhar
            </Button>
          )}

          {privado && (
            <p className="text-xs text-muted-foreground">
              Este clube é privado: quem entrar pelo link fica aguardando a sua aprovação na aba Membros.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
