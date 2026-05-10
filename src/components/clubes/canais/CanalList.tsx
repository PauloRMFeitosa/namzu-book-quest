import { Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CriarCanalDialog } from "./CriarCanalDialog";
import { useCanais } from "@/hooks/clubes/useCanais";

interface Props {
  clubeId: string;
  isCurador: boolean;
  selecionado: string | null;
  onSelecionar: (id: string) => void;
}

export const CanalList = ({ clubeId, isCurador, selecionado, onSelecionar }: Props) => {
  const { data: canais, isLoading } = useCanais(clubeId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Canais
        </h3>
        {isCurador && <CriarCanalDialog clubeId={clubeId} />}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {isLoading ? (
          <div className="space-y-1.5 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : !canais?.length ? (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            {isCurador ? "Crie o primeiro canal." : "Nenhum canal ainda."}
          </p>
        ) : (
          canais.map((c) => {
            const ativo = selecionado === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelecionar(c.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-all duration-200",
                  ativo
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {c.privado ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{c.nome}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
