import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ObraAutocomplete } from "@/components/cadastro-manual/ObraAutocomplete";
import { useAdicionarTrilha } from "@/hooks/clubes/useClubeTrilhasGestao";
const draftKey = (id: string) => `draft-trilha-${id}`;

export const AdicionarObraTrilhaDialog = ({
  clubeId,
  open,
  onOpenChange,
}: {
  clubeId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [titulo, setTitulo] = useState("");
  const [obraId, setObraId] = useState<string | null>(null);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const adicionar = useAdicionarTrilha(clubeId);

  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(draftKey(clubeId));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.titulo !== undefined) setTitulo(d.titulo);
      if (d.obraId !== undefined) setObraId(d.obraId);
      if (d.inicio !== undefined) setInicio(d.inicio);
      if (d.fim !== undefined) setFim(d.fim);
    } catch {}
  }, [open, clubeId]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(clubeId), JSON.stringify({ titulo, obraId, inicio, fim }));
  }, [open, clubeId, titulo, obraId, inicio, fim]);

  const reset = () => {
    setTitulo("");
    setObraId(null);
    setInicio("");
    setFim("");
  };

  const submit = async () => {
    if (!obraId) return;
    await adicionar.mutateAsync({
      obra_id: obraId,
      data_inicio_sugerida: inicio || null,
      data_fim_sugerida: fim || null,
    });
    localStorage.removeItem(draftKey(clubeId));
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar obra à trilha</DialogTitle>
          <DialogDescription>
            Busque uma obra existente no acervo para incluir na jornada do clube.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Obra</Label>
            <ObraAutocomplete
              value={titulo}
              obraId={obraId}
              onChange={(t, id) => {
                setTitulo(t);
                setObraId(id);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Início sugerido</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Fim sugerido</Label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!obraId || adicionar.isPending}>
            {adicionar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
