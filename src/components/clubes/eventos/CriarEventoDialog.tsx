import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useCriarEvento } from "@/hooks/clubes/useEventos";
const draftKey = (id: string) => `draft-evento-${id}`;
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const CriarEventoDialog = ({ clubeId }: { clubeId: string }) => {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("encontro");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [url, setUrl] = useState("");
  const [limite, setLimite] = useState("");
  const criar = useCriarEvento(clubeId);

  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(draftKey(clubeId));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.titulo !== undefined) setTitulo(d.titulo);
      if (d.descricao !== undefined) setDescricao(d.descricao);
      if (d.tipo) setTipo(d.tipo);
      if (d.inicio !== undefined) setInicio(d.inicio);
      if (d.fim !== undefined) setFim(d.fim);
      if (d.url !== undefined) setUrl(d.url);
      if (d.limite !== undefined) setLimite(d.limite);
    } catch {}
  }, [open, clubeId]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(clubeId), JSON.stringify({ titulo, descricao, tipo, inicio, fim, url, limite }));
  }, [open, clubeId, titulo, descricao, tipo, inicio, fim, url, limite]);

  const submit = async () => {
    if (!titulo.trim() || !inicio) return;
    await criar.mutateAsync({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      tipo,
      inicio_em: new Date(inicio).toISOString(),
      fim_em: fim ? new Date(fim).toISOString() : null,
      url_evento: url.trim() || null,
      limite_participantes: limite ? Number(limite) : null,
    });
    localStorage.removeItem(draftKey(clubeId));
    setOpen(false);
    setTitulo("");
    setDescricao("");
    setInicio("");
    setFim("");
    setUrl("");
    setLimite("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" />
          Novo evento
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[var(--radius)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Criar evento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="encontro">Encontro</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="leitura_coletiva">Leitura coletiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Limite</Label>
              <Input
                type="number"
                min={1}
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                placeholder="Sem limite"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Início</Label>
              <Input
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input
                type="datetime-local"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Link (Zoom, Meet, etc.)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </div>
          <Button
            onClick={submit}
            disabled={criar.isPending || !titulo.trim() || !inicio}
            className="rounded-xl mt-2"
          >
            {criar.isPending ? "Criando..." : "Criar evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
