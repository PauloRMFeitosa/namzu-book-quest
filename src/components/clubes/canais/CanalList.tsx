import { Hash, Lock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CriarCanalDialog } from "./CriarCanalDialog";
import { useCanais } from "@/hooks/clubes/useCanais";

interface Props {
  clubeId: string;
  isCurador: boolean;
  selecionado: string | null;
  onSelecionar: (id: string) => void;
}

export const CanalList = ({ clubeId, isCurador, selecionado: _selecionado, onSelecionar }: Props) => {
  const { data: canais, isLoading } = useCanais(clubeId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/60 shrink-0">
        <h3 className="font-display font-semibold text-base">Canais</h3>
        {isCurador && <CriarCanalDialog clubeId={clubeId} />}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !canais?.length ? (
          <p className="text-sm text-muted-foreground px-4 py-8 text-center">
            {isCurador ? "Crie o primeiro canal." : "Nenhum canal ainda."}
          </p>
        ) : (
          <ul>
            {canais.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelecionar(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/40 last:border-0"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    {c.privado
                      ? <Lock className="w-4 h-4 text-muted-foreground" />
                      : <Hash className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.nome}</p>
                    {c.descricao && (
                      <p className="text-xs text-muted-foreground truncate">{c.descricao}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
