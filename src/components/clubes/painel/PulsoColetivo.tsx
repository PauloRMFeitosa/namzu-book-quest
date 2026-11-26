import { TrendingUp } from "lucide-react";

interface Props {
  membros: number;
  ativos7d: number;
  ativos30d: number;
}

/** Quantos membros o clube tem e quantos estiveram ativos. Fica no topo da aba Membros. */
export const PulsoColetivo = ({ membros, ativos7d, ativos30d }: Props) => {
  const engajamento = membros > 0 ? Math.min(100, Math.round((ativos7d / membros) * 100)) : 0;
  return (
    <section className="card-soft p-4 flex flex-col gap-3" aria-label="Pulso coletivo">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" /> Pulso coletivo
        </h3>
        {membros > 0 && (
          <span className="text-xs text-muted-foreground">
            Engajamento na semana: <span className="font-semibold text-foreground">{engajamento}%</span>
          </span>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Numero rotulo="Membros" valor={membros} />
        <Numero rotulo="Ativos em 7 dias" valor={ativos7d} />
        <Numero rotulo="Ativos em 30 dias" valor={ativos30d} />
      </dl>
      {membros > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden" aria-hidden="true">
          <div className="h-full bg-gradient-warm rounded-full transition-all" style={{ width: `${engajamento}%` }} />
        </div>
      )}
    </section>
  );
};

const Numero = ({ rotulo, valor }: { rotulo: string; valor: number }) => (
  <div className="flex flex-col-reverse">
    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{rotulo}</dt>
    <dd className="font-display text-lg font-semibold">{valor}</dd>
  </div>
);
