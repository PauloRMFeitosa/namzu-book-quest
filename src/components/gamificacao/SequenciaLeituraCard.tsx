import { Flame } from "lucide-react";
import { useSequenciaLeitura } from "@/hooks/gamificacao/useSequenciaLeitura";

export const SequenciaLeituraCard = () => {
  const { data } = useSequenciaLeitura();
  const atual = data?.atual ?? 0;
  const maximo = data?.maximo ?? 0;

  return (
    <div className="card-soft p-5 h-full flex flex-col items-center text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        Sequência atual
      </p>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 mt-3">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Flame className="w-7 h-7 text-orange-500" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-tight">
            {atual} <span className="text-sm font-medium text-muted-foreground">{atual === 1 ? "dia consecutivo" : "dias consecutivos"}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Melhor sequência: <span className="font-semibold text-foreground">{maximo} dias</span>
          </p>
        </div>
      </div>
    </div>
  );
};
