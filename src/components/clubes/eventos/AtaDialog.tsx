import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAtaEvento, useSalvarAta } from "@/hooks/clubes/useEncontros";
import { MAXIMO_ATA, validarAta } from "@/lib/encontros";

interface Props {
  clubeId: string;
  evento: { id: string; titulo: string };
  /** Organizador e admin escrevem; os demais só leem. */
  podeEditar: boolean;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}

const draftKey = (eventoId: string) => `draft-ata-${eventoId}`;

// Ata do encontro (Fase 3): o que foi conversado e combinado.
export const AtaDialog = ({ clubeId, evento, podeEditar, open, onOpenChange }: Props) => {
  const { data: ata, isFetching } = useAtaEvento(evento.id, open);
  const salvar = useSalvarAta(clubeId);
  const salvo = ata?.texto ?? "";
  const [texto, setTexto] = useState("");
  const [pronto, setPronto] = useState(false);
  const [restaurado, setRestaurado] = useState(false);

  // Ao abrir: retoma o rascunho, se houver; senão parte do que está salvo.
  useEffect(() => {
    if (!open) {
      setPronto(false);
      setRestaurado(false);
      return;
    }
    if (pronto || isFetching) return;
    const rascunho = podeEditar ? localStorage.getItem(draftKey(evento.id)) : null;
    if (rascunho !== null && rascunho !== salvo) {
      setTexto(rascunho);
      setRestaurado(true);
    } else {
      setTexto(salvo);
    }
    setPronto(true);
  }, [open, pronto, isFetching, podeEditar, evento.id, salvo]);

  const alterado = pronto && texto.trim() !== salvo.trim();

  // Guarda o rascunho só enquanto há algo diferente do que está salvo.
  useEffect(() => {
    if (!open || !pronto || !podeEditar) return;
    if (alterado) localStorage.setItem(draftKey(evento.id), texto);
    else localStorage.removeItem(draftKey(evento.id));
  }, [open, pronto, podeEditar, alterado, texto, evento.id]);

  const enviar = async () => {
    const problema = validarAta(texto);
    if (problema) {
      toast.error(problema);
      return;
    }
    try {
      await salvar.mutateAsync({ eventoId: evento.id, texto });
    } catch {
      return; // o hook já mostrou o erro; o rascunho fica guardado
    }
    localStorage.removeItem(draftKey(evento.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Ata do encontro</DialogTitle>
          <DialogDescription>
            {evento.titulo}.
            {podeEditar ? " Registre o que foi conversado e combinado. Só quem faz parte do clube lê." : ""}
          </DialogDescription>
        </DialogHeader>

        {!pronto ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : podeEditar ? (
          <div className="flex flex-col gap-2">
            {restaurado && alterado && (
              <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2">
                Retomamos o texto que você não tinha salvado.
              </p>
            )}
            <Textarea
              aria-label="Texto da ata"
              rows={12}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={"O que conversamos\nO que ficou combinado\nPróximo encontro"}
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {texto.trim().length.toLocaleString("pt-BR")} de {MAXIMO_ATA.toLocaleString("pt-BR")}
            </p>
          </div>
        ) : salvo ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm whitespace-pre-wrap break-words">{salvo}</p>
            {ata?.atualizado_em && (
              <p className="text-xs text-muted-foreground">
                Atualizada em {format(new Date(ata.atualizado_em), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">Este encontro ainda não tem ata.</p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {podeEditar ? "Cancelar" : "Fechar"}
          </Button>
          {podeEditar && (
            <Button onClick={enviar} disabled={!pronto || salvar.isPending || !alterado}>
              {salvar.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : salvo && !texto.trim() ? (
                "Apagar ata"
              ) : (
                "Salvar ata"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
