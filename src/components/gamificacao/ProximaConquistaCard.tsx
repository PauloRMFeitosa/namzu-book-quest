import { Trophy } from "lucide-react";
import { useProximaConquista } from "@/hooks/gamificacao/useProximaConquista";

export const ProximaConquistaCard = () => {
  const { data } = useProximaConquista();
  if (!data) return null;
  const { conquista, falta, unidade, atual, meta } = data;

  return (
    <div className="card-soft p-5 h-full flex flex-col items-center text-center shrink-0 w-[78%] snap-start md:w-auto">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        Próxima conquista
      </p>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 mt-3">
        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-yellow-500" />
        </div>
        <div>
          <p className="font-bold leading-tight">{conquista.nome}</p>
          <p className="text-xs text-muted-foreground">
            Faltam <span className="font-semibold text-foreground">{falta} {unidade}</span> · {atual}/{meta}
          </p>
          <p className="text-xs font-bold text-yellow-600 mt-0.5">+{conquista.xp_recompensa} XP</p>
        </div>
      </div>
    </div>
  );
};
