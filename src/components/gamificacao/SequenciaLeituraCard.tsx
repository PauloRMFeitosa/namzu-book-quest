import { Flame } from "lucide-react";
import { useSequenciaLeitura } from "@/hooks/gamificacao/useSequenciaLeitura";

export const SequenciaLeituraCard = () => {
  const { data } = useSequenciaLeitura();
  const atual = data?.atual ?? 0;
  const maximo = data?.maximo ?? 0;

  return (
    <div className="card-soft p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
        <Flame className="w-7 h-7 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Sequência atual
        </p>
        <p className="text-2xl font-bold leading-tight">
          {atual} <span className="text-sm font-medium text-muted-foreground">{atual === 1 ? "dia consecutivo" : "dias consecutivos"}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Melhor sequência: <span className="font-semibold text-foreground">{maximo} dias</span>
        </p>
      </div>
    </div>
  );
};
