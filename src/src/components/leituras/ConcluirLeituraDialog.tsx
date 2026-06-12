import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (dataFim: string) => Promise<void> | void;
}

export const ConcluirLeituraDialog = ({ open, onOpenChange, onConfirm }: Props) => {
  const today = new Date().toISOString().slice(0, 10);
  const [modo, setModo] = useState<"hoje" | "outra">("hoje");
  const [data, setData] = useState<string>(today);
  const [loading, setLoading] = useState(false);

  const confirmar = async () => {
    setLoading(true);
    try {
      await onConfirm(modo === "hoje" ? today : data);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Concluir leitura</DialogTitle>
          <DialogDescription>Quando você terminou este livro?</DialogDescription>
        </DialogHeader>

        <RadioGroup value={modo} onValueChange={(v) => setModo(v as "hoje" | "outra")} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="hoje" id="c-hoje" />
            <Label htmlFor="c-hoje">Hoje</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="outra" id="c-outra" />
            <Label htmlFor="c-outra">Outra data</Label>
          </div>
          {modo === "outra" && (
            <Input
              type="date"
              value={data}
              max={today}
              onChange={(e) => setData(e.target.value)}
              className="h-11 rounded-xl"
            />
          )}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={loading} className="bg-primary hover:bg-primary-hover">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
