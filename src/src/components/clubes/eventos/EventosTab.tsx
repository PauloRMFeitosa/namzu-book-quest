import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventosClube } from "@/hooks/clubes/useEventos";
import { EventoCard } from "./EventoCard";
import { CriarEventoDialog } from "./CriarEventoDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalIcon } from "lucide-react";

interface Props {
  clubeId: string;
  curadorId: string;
  isMembro: boolean;
}

export const EventosTab = ({ clubeId, curadorId, isMembro }: Props) => {
  const { user } = useAuth();
  const isCurador = user?.id === curadorId;
  const { data: eventos = [], isLoading } = useEventosClube(clubeId);
  const [filtro, setFiltro] = useState<"futuros" | "passados">("futuros");

  const { futuros, passados } = useMemo(() => {
    const agora = new Date();
    return {
      futuros: eventos.filter((e) => new Date(e.inicio_em) >= agora),
      passados: eventos
        .filter((e) => new Date(e.inicio_em) < agora)
        .reverse(),
    };
  }, [eventos]);

  const lista = filtro === "futuros" ? futuros : passados;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl">
          {(["futuros", "passados"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filtro === f
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "futuros" ? `Próximos (${futuros.length})` : `Passados (${passados.length})`}
            </button>
          ))}
        </div>
        {isCurador && <CriarEventoDialog clubeId={clubeId} />}
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="card-soft p-10 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
          <CalIcon className="w-8 h-8 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">
            {filtro === "futuros" ? "Nenhum evento marcado" : "Sem eventos passados"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isCurador
              ? "Crie o primeiro encontro deste clube — uma live, leitura coletiva ou workshop."
              : "Quando o curador agendar algo, aparecerá aqui."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((e) => (
            <EventoCard key={e.id} evento={e} isMembro={isMembro} clubeId={clubeId} />
          ))}
        </div>
      )}
    </div>
  );
};
