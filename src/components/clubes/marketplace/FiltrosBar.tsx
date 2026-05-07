import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { cn } from "@/lib/utils";

interface Props {
  busca: string;
  onBusca: (v: string) => void;
  categoria: string | null;
  onCategoria: (v: string | null) => void;
}

export const FiltrosBar = ({ busca, onBusca, categoria, onCategoria }: Props) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          placeholder="Buscar clubes, autores, temas…"
          className="pl-9 h-11 rounded-2xl border-border/70 bg-card"
        />
        {busca && (
          <button
            onClick={() => onBusca("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <CategoriaChip
          label="Todos"
          active={categoria === null}
          onClick={() => onCategoria(null)}
        />
        {CATEGORIAS.map((c) => (
          <CategoriaChip
            key={c.value}
            label={c.label}
            active={categoria === c.value}
            onClick={() => onCategoria(categoria === c.value ? null : c.value)}
          />
        ))}
      </div>
    </div>
  );
};

const CategoriaChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "shrink-0 px-3.5 h-8 rounded-full text-xs font-medium border transition-all",
      active
        ? "bg-foreground text-background border-foreground shadow-soft"
        : "bg-card text-muted-foreground border-border/70 hover:border-foreground/40 hover:text-foreground"
    )}
  >
    {label}
  </button>
);
