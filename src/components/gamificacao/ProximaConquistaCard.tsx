import { Trophy } from "lucide-react";
import { useProximaConquista } from "@/hooks/gamificacao/useProximaConquista";

const RARIDADE_ESTILO: Record<string, { label: string; cor: string }> = {
  comum:      { label: "Comum",     cor: "text-muted-foreground bg-muted/60" },
  rara:       { label: "Rara",      cor: "text-blue-600 bg-blue-500/10" },
  epica:      { label: "Épica",     cor: "text-purple-600 bg-purple-500/10" },
  legendaria: { label: "Lendária",  cor: "text-yellow-600 bg-yellow-500/10" },
};

export const ProximaConquistaCard = () => {
  const { data } = useProximaConquista();
  if (!data) return null;

  const { conquista, falta, unidade, atual, meta } = data;
  const raridade = RARIDADE_ESTILO[(conquista as any).raridade ?? "comum"] ?? RARIDADE_ESTILO.comum;

  return (
    <div className="card-soft p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
        <Trophy className="w-7 h-7 text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Próxima conquista
          </p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${raridade.cor}`}>
            {raridade.label}
          </span>
        </div>
        <p className="font-bold leading-tight">{conquista.nome}</p>
        <p className="text-xs text-muted-foreground">
          Faltam <span className="font-semibold text-foreground">{falta} {unidade}</span>{" "}
          · {atual}/{meta}
        </p>
      </div>
      <span className="text-xs font-bold text-yellow-600 shrink-0">
        +{conquista.xp_recompensa} XP
      </span>
    </div>
  );
};
