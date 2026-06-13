import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Hash } from "lucide-react";
import { useCriarCanal } from "@/hooks/clubes/useCanais";
const draftKey = (id: string) => `draft-canal-${id}`;

export const CriarCanalDialog = ({ clubeId }: { clubeId: string }) => {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const criar = useCriarCanal(clubeId);

  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(draftKey(clubeId));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.nome !== undefined) setNome(d.nome);
      if (d.descricao !== undefined) setDescricao(d.descricao);
    } catch {}
  }, [open, clubeId]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(clubeId), JSON.stringify({ nome, descricao }));
  }, [open, clubeId, nome, descricao]);

  const submit = async () => {
    if (!nome.trim()) return;
    await criar.mutateAsync({ nome, descricao });
    localStorage.removeItem(draftKey(clubeId));
    setNome("");
    setDescricao("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Criar canal">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Hash className="w-4 h-4" /> Novo canal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="discussao-geral" />
          </div>
          <div>
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <Textarea id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Sobre o que é este canal?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!nome.trim() || criar.isPending}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
