import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMissoesDiarias } from "@/hooks/gamificacao/useMissoesDiarias";

export const MissoesDiariasCard = () => {
  const { data: missoes = [] } = useMissoesDiarias();
  if (!missoes.length) return null;

  return (
    <div className="card-soft p-5">
      <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">
        Missões de hoje
      </p>
      <div className="flex flex-col gap-3">
        {missoes.map((m: any) => (
          <div key={m.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {m.concluida && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${m.concluida ? "line-through text-muted-foreground" : ""}`}>
                    {m.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.descricao}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-primary shrink-0">+{m.xp_recompensa} XP</span>
            </div>
            <Progress value={m.percentual} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              {m.atual} / {m.meta_valor}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
