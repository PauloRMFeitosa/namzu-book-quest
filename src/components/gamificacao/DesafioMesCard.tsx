import { BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDesafioMes } from "@/hooks/gamificacao/useDesafioMes";

export const DesafioMesCard = () => {
  const { data } = useDesafioMes();
  if (!data?.missao) return null;
  const { paginas, meta, percentual, missao } = data;

  return (
    <div className="card-soft p-5 h-full">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            Desafio do mês
          </p>
          <p className="font-bold leading-tight">{missao.titulo}</p>
          <p className="text-xs text-muted-foreground">{missao.descricao}</p>
        </div>
        <span className="text-xs font-bold text-primary shrink-0">+{missao.xp_recompensa} XP</span>
      </div>
      <Progress value={percentual} className="h-2.5" />
      <div className="flex justify-between text-xs mt-1.5">
        <span className="font-semibold">
          {paginas} / {meta} páginas
        </span>
        <span className="text-muted-foreground">{percentual}%</span>
      </div>
    </div>
  );
};
