import { Progress } from "@/components/ui/progress";

interface Props {
  paginasLidas: number;
  totalPaginas: number | null;
  percentual: number;
  restantes: number | null;
  compact?: boolean;
}

export const ProgressoBar = ({ paginasLidas, totalPaginas, percentual, restantes, compact }: Props) => {
  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={percentual} className={compact ? "h-1.5" : "h-2"} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {totalPaginas
            ? `${paginasLidas}/${totalPaginas} pgs · ${percentual}%`
            : `${paginasLidas} pgs lidas`}
        </span>
        {restantes !== null && <span>{restantes} restantes</span>}
      </div>
    </div>
  );
};
