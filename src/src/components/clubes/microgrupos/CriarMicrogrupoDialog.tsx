import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCriarMicrogrupo } from "@/hooks/clubes/useMicrogrupos";

export const CriarMicrogrupoDialog = ({
  open,
  onOpenChange,
  clubeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubeId: string;
}) => {
  const criar = useCriarMicrogrupo(clubeId);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("fixo");
  const [limite, setLimite] = useState("10");
  const [privado, setPrivado] = useState(true);

  const submit = async () => {
    if (!nome.trim()) return;
    await criar.mutateAsync({
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      tipo,
      limite_membros: Number(limite) || 10,
      privado,
    });
    setNome("");
    setDescricao("");
    setTipo("fixo");
    setLimite("10");
    setPrivado(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Criar microgrupo</DialogTitle>
          <DialogDescription>
            Tribos pequenas e íntimas para conversas mais profundas dentro do clube.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mg-nome">Nome</Label>
            <Input
              id="mg-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Filosofia matinal"
              maxLength={60}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mg-desc">Descrição</Label>
            <Textarea
              id="mg-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O propósito desta tribo…"
              rows={3}
              maxLength={280}
              className="rounded-xl resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="rotativo">Rotativo</SelectItem>
                  <SelectItem value="evento">Por evento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mg-lim">Limite de membros</Label>
              <Input
                id="mg-lim"
                type="number"
                min={2}
                max={50}
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Privado</p>
              <p className="text-xs text-muted-foreground">
                Apenas membros do clube convidados podem ver.
              </p>
            </div>
            <Switch checked={privado} onCheckedChange={setPrivado} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={!nome.trim() || criar.isPending}
            className="rounded-xl bg-primary hover:bg-primary-hover"
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
