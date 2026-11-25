import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEnviarAviso } from "@/hooks/clubes/useAvisos";
import { MAXIMO_MENSAGEM_AVISO, MAXIMO_TITULO_AVISO, validarAviso } from "@/lib/avisos";

interface Props {
  clubeId: string;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}

const draftKey = (clubeId: string) => `draft-aviso-${clubeId}`;

// Organizador escreve um aviso para todos os membros do clube (Fase 3).
export const EnviarAvisoDialog = ({ clubeId, open, onOpenChange }: Props) => {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const enviar = useEnviarAviso(clubeId);

  // Restaura o rascunho ao abrir.
  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(draftKey(clubeId));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (typeof d.titulo === "string") setTitulo(d.titulo);
      if (typeof d.mensagem === "string") setMensagem(d.mensagem);
    } catch {
      // rascunho ilegível: começa em branco
    }
  }, [open, clubeId]);

  // Salva o rascunho a cada alteração.
  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(clubeId), JSON.stringify({ titulo, mensagem }));
  }, [open, clubeId, titulo, mensagem]);

  const submit = async () => {
    const problema = validarAviso(titulo, mensagem);
    if (problema) {
      toast.error(problema);
      return;
    }
    try {
      await enviar.mutateAsync({ titulo, mensagem });
    } catch {
      return; // o hook já mostrou o erro; o rascunho fica guardado
    }
    localStorage.removeItem(draftKey(clubeId));
    setTitulo("");
    setMensagem("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Enviar aviso</DialogTitle>
          <DialogDescription>
            Todos os membros ativos recebem uma notificação no app. O aviso também fica guardado no clube.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="aviso-titulo" className="text-xs">
              Título
            </Label>
            <Input
              id="aviso-titulo"
              maxLength={MAXIMO_TITULO_AVISO}
              placeholder="Ex.: Mudança de horário"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="aviso-mensagem" className="text-xs">
              Mensagem
            </Label>
            <Textarea
              id="aviso-mensagem"
              rows={6}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="O que os membros precisam saber?"
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {mensagem.trim().length.toLocaleString("pt-BR")} de {MAXIMO_MENSAGEM_AVISO.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={enviar.isPending}>
            {enviar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar aviso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
