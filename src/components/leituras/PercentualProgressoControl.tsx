import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface PercentualProgressoControlProps {
  percentual: number;
  onPercentualChange: (value: number) => void;
  pagina: string;
  onPaginaChange: (value: string) => void;
  totalPaginas: number | null;
  capitulo?: string;
  onCapituloChange?: (value: string) => void;
}

export const PercentualProgressoControl = ({
  percentual,
  onPercentualChange,
  pagina,
  onPaginaChange,
  totalPaginas,
  capitulo,
  onCapituloChange,
}: PercentualProgressoControlProps) => {
  const pct = Math.max(0, Math.min(100, Math.round(percentual || 0)));
  const showCapitulo = typeof capitulo === "string" && !!onCapituloChange;

  const handlePercentualChange = (value: number) => {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    onPercentualChange(next);
    if (totalPaginas) onPaginaChange(Math.round((next / 100) * totalPaginas).toString());
  };

  const handlePaginaChange = (value: string) => {
    onPaginaChange(value);
    if (totalPaginas && value) {
      const paginaAtual = Number(value);
      if (!Number.isNaN(paginaAtual)) {
        onPercentualChange(Math.max(0, Math.min(100, Math.round((paginaAtual / totalPaginas) * 100))));
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Percentual lido · {pct}%
        </Label>
        <Slider value={[pct]} onValueChange={(value) => handlePercentualChange(value[0])} min={0} max={100} step={5} />
      </div>

      <div className={`grid gap-3 ${showCapitulo ? "grid-cols-2" : "grid-cols-1"}`}>
        {showCapitulo && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capitulo-atual" className="text-xs">Capítulo atual</Label>
            <Input id="capitulo-atual" value={capitulo} onChange={(event) => onCapituloChange(event.target.value)} placeholder="ex: 4" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pagina-atual" className="text-xs">
            Página atual{totalPaginas ? ` / ${totalPaginas}` : ""}
          </Label>
          <Input
            id="pagina-atual"
            type="number"
            min={0}
            max={totalPaginas ?? undefined}
            value={pagina}
            onChange={(event) => handlePaginaChange(event.target.value)}
            placeholder={totalPaginas ? `0 a ${totalPaginas}` : "ex: 87"}
          />
        </div>
      </div>

      <Button type="button" variant="ghost" size="sm" className="rounded-xl self-start" onClick={() => handlePercentualChange(100)}>
        <CheckCircle2 className="w-4 h-4" /> Marcar como concluído
      </Button>
    </div>
  );
};