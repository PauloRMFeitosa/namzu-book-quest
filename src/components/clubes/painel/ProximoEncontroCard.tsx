import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useProximosEventos } from "@/hooks/clubes/useClube";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { quandoDoEncontro } from "@/lib/encontros";

/** O próximo encontro do clube, no topo do Feed. Leva à aba Eventos. Some quando não há encontro marcado. */
export const ProximoEncontroCard = ({ clubeId }: { clubeId: string }) => {
  const { data: eventos = [] } = useProximosEventos(clubeId);
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  const proximo = eventos[0];

  if (!proximo || !(isAdmin || flags.show_clube_eventos)) return null;

  const outros = eventos.length - 1;
  return (
    <Link
      to={`/clubes/${clubeId}?tab=eventos`}
      className="card-soft p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
      aria-label={`Próximo encontro: ${proximo.titulo}. Ver eventos do clube`}
    >
      <span className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
        <CalendarDays className="w-5 h-5 text-primary" />
      </span>
      <span className="min-w-0 flex-1 flex flex-col">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Próximo encontro</span>
        <span className="text-sm font-medium truncate">{proximo.titulo}</span>
        <span className="text-xs text-muted-foreground">
          {quandoDoEncontro(proximo.inicio_em)}
          {outros > 0 ? ` · e mais ${outros} ${outros === 1 ? "marcado" : "marcados"}` : ""}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
  );
};
