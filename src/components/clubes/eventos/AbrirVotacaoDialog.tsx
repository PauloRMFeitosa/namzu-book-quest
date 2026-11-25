import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { useAbrirVotacao } from "@/hooks/clubes/useVotacaoData";
import { MAXIMO_OPCOES, MINIMO_OPCOES, opcoesParaEnvio, validarVotacao } from "@/lib/votacaoData";

interface Props {
  clubeId: string;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}

const draftKey = (clubeId: string) => `draft-votacao-data-${clubeId}`;
const DATAS_INICIAIS = ["", ""];

// Organizador propõe as datas do próximo encontro (Fase 3).
export const AbrirVotacaoDialog = ({ clubeId, open, onOpenChange }: Props) => {
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [datas, setDatas] = useState<string[]>(DATAS_INICIAIS);
  const abrir = useAbrirVotacao(clubeId);

  // Restaura o rascunho ao abrir.
  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(draftKey(clubeId));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (typeof d.titulo === "string") setTitulo(d.titulo);
      if (typeof d.url === "string") setUrl(d.url);
      if (Array.isArray(d.datas) && d.datas.length >= MINIMO_OPCOES) setDatas(d.datas.slice(0, MAXIMO_OPCOES));
    } catch {
      // rascunho ilegível: começa em branco
    }
  }, [open, clubeId]);

  // Salva o rascunho a cada alteração.
  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(clubeId), JSON.stringify({ titulo, url, datas }));
  }, [open, clubeId, titulo, url, datas]);

  const mudarData = (indice: number, valor: string) =>
    setDatas((atual) => atual.map((d, i) => (i === indice ? valor : d)));

  const enviar = async () => {
    const problema = validarVotacao(titulo, datas);
    if (problema) {
      toast.error(problema);
      return;
    }
    try {
      await abrir.mutateAsync({ titulo, opcoes: opcoesParaEnvio(datas), urlEvento: url });
    } catch {
      return; // o hook já mostrou o erro; o rascunho fica guardado
    }
    localStorage.removeItem(draftKey(clubeId));
    setTitulo("");
    setUrl("");
    setDatas(DATAS_INICIAIS);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Votar a data do encontro</DialogTitle>
          <DialogDescription>
            Proponha de {MINIMO_OPCOES} a {MAXIMO_OPCOES} datas. Os membros marcam quando podem e você escolhe uma
            para marcar o encontro.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="votacao-titulo" className="text-xs">
              Nome do encontro
            </Label>
            <Input
              id="votacao-titulo"
              maxLength={120}
              placeholder="Ex.: Conversa sobre o livro do mês"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Datas propostas</p>
            {datas.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  aria-label={`Data ${i + 1}`}
                  value={d}
                  onChange={(e) => mudarData(i, e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                  aria-label={`Remover data ${i + 1}`}
                  disabled={datas.length <= MINIMO_OPCOES}
                  onClick={() => setDatas((atual) => atual.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl gap-1.5 self-start"
              disabled={datas.length >= MAXIMO_OPCOES}
              onClick={() => setDatas((atual) => [...atual, ""])}
            >
              <Plus className="w-4 h-4" /> Adicionar data
            </Button>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="votacao-url" className="text-xs">
              Link da chamada (opcional)
            </Label>
            <Input id="votacao-url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={abrir.isPending}>
            {abrir.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Abrir votação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
