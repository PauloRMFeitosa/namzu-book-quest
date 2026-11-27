import { Skeleton } from "@/components/ui/skeleton";
import { Bloco } from "@/components/painel/PartesDoPainel";
import { usePlanoDoClube } from "@/hooks/clubes/usePlanoDoClube";
import { formatarPreco } from "@/lib/planos";
import { textoDaValidade, usoDoLimite, type UsoDoLimite } from "@/lib/planoDoClube";
import { cn } from "@/lib/utils";

const LinhaDeUso = ({ rotulo, uso, ajuda }: { rotulo: string; uso: UsoDoLimite; ajuda?: string }) => {
  const lotado = uso.situacao === "cheio" || uso.situacao === "acima";
  return (
    <div className="flex flex-col gap-1.5 py-2.5 border-b border-border/60 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{rotulo}</span>
        <span className={cn("text-sm font-medium tabular-nums", lotado && "text-amber-700 dark:text-amber-300")}>
          {uso.texto}
          {lotado && <span className="font-normal"> · no limite</span>}
        </span>
      </div>
      {uso.percentual !== null && (
        <div
          className="h-1.5 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={uso.limite ?? 0}
          aria-valuenow={Math.min(uso.usado, uso.limite ?? 0)}
          aria-label={`${rotulo}: ${uso.texto}`}
        >
          <div
            className={cn("h-full rounded-full", lotado ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${uso.percentual}%` }}
          />
        </div>
      )}
      {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  );
};

// Painel do organizador > Configurações: o plano que vale para o clube e
// quanto dos limites já foi usado.
export const PlanoDoPainel = ({ clubeId }: { clubeId: string }) => {
  const { data, isLoading, error } = usePlanoDoClube(clubeId);

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  // Sem a função no banco ou sem plano padrão: não há o que mostrar, e nada é limitado.
  if (error || !data?.plano) return null;

  const { plano, uso } = data;
  const validade = textoDaValidade(data.valido_ate);
  const gratis = !plano.preco_mensal_centavos;

  return (
    <Bloco
      titulo={`Plano ${plano.nome}`}
      descricao={[plano.descricao, gratis ? null : `${formatarPreco(plano.preco_mensal_centavos ?? 0)} por mês`, validade]
        .filter(Boolean)
        .join(" · ")}
    >
      <div>
        <LinhaDeUso rotulo="Membros neste clube" uso={usoDoLimite(uso.membros, plano.limite_membros)} />
        <LinhaDeUso
          rotulo="Clubes que o organizador tem"
          uso={usoDoLimite(uso.clubes, plano.limite_clubes)}
        />
        <LinhaDeUso
          rotulo="Co-curadores neste clube"
          uso={usoDoLimite(uso.co_curadores, plano.limite_co_curadores)}
          ajuda={plano.limite_co_curadores === null || plano.limite_co_curadores === undefined ? "Cada clube aceita até 3 co-curadores." : undefined}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        O plano é de quem criou o clube e vale para todos os clubes dessa pessoa. Ao chegar a um limite, novas entradas
        ficam bloqueadas; quem já está no clube continua.
      </p>
    </Bloco>
  );
};
