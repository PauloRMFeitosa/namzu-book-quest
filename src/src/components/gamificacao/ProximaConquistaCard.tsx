import { Trophy } from "lucide-react";
import { useProximaConquista } from "@/hooks/gamificacao/useProximaConquista";

export const ProximaConquistaCard = () => {
  const { data } = useProximaConquista();
  if (!data) return null;
  const { conquista, falta, unidade, atual, meta } = data;

  return (
    <div className="card-soft p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
        <Trophy className="w-7 h-7 text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Próxima conquista
        </p>
        <p className="font-bold leading-tight">{conquista.nome}</p>
        <p className="text-xs text-muted-foreground">
          Faltam <span className="font-semibold text-foreground">{falta} {unidade}</span> · {atual}/{meta}
        </p>
      </div>
      <span className="text-xs font-bold text-yellow-600 shrink-0">+{conquista.xp_recompensa} XP</span>
    </div>
  );
};
