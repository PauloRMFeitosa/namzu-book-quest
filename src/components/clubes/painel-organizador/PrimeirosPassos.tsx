import { Link } from "react-router-dom";
import { Check, PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  progressoDoRoteiro,
  textoDoProgresso,
  type DestinoDoPasso,
  type PassoDoRoteiro,
} from "@/lib/primeirosPassos";
import { cn } from "@/lib/utils";

interface Props {
  nomeClube: string;
  passos: PassoDoRoteiro[];
  /** Acabou de criar o clube: o cartão abre com as boas-vindas. */
  recemCriado?: boolean;
  onIrPara: (secao: string) => void;
  onConvidar: () => void;
  onDispensar: () => void;
}

const BotaoDoPasso = ({
  passo,
  destaque,
  onIrPara,
  onConvidar,
}: {
  passo: PassoDoRoteiro;
  destaque: boolean;
  onIrPara: (secao: string) => void;
  onConvidar: () => void;
}) => {
  const variante = destaque ? "default" : "outline";
  const destino: DestinoDoPasso = passo.destino;
  if (destino.tipo === "rota") {
    return (
      <Button asChild size="sm" variant={variante} className="shrink-0">
        <Link to={destino.rota}>{passo.acao}</Link>
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant={variante}
      className="shrink-0"
      onClick={() => (destino.tipo === "secao" ? onIrPara(destino.secao) : onConvidar())}
    >
      {passo.acao}
    </Button>
  );
};

// Roteiro "Primeiros passos", no topo da Visão geral do painel: o que fazer
// depois de criar o clube. Os passos se marcam sozinhos (src/lib/primeirosPassos.ts).
export const PrimeirosPassos = ({ nomeClube, passos, recemCriado, onIrPara, onConvidar, onDispensar }: Props) => {
  const progresso = progressoDoRoteiro(passos);
  const percentual = Math.round((progresso.feitos / progresso.total) * 100);

  const titulo = progresso.pronto
    ? "O clube está pronto para receber os membros"
    : recemCriado
      ? `${nomeClube} está criado`
      : "Primeiros passos";
  const descricao = progresso.pronto
    ? "Você cumpriu os passos principais. Falta só o que é opcional."
    : recemCriado
      ? "Siga os passos abaixo para deixar o clube pronto antes de os membros chegarem. Você pode fazer no seu ritmo: o roteiro fica aqui."
      : "O que falta para deixar o clube pronto. Os passos se marcam sozinhos conforme você avança.";

  return (
    <section
      aria-labelledby="primeiros-passos-titulo"
      className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5 flex flex-col gap-4 min-w-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          {(recemCriado || progresso.pronto) && (
            <span className="hidden sm:flex w-10 h-10 rounded-full bg-primary/10 text-primary items-center justify-center shrink-0">
              <PartyPopper className="w-5 h-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="primeiros-passos-titulo" className="font-display text-lg sm:text-xl font-semibold break-words">
              {titulo}
            </h2>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 gap-1.5 text-muted-foreground"
          onClick={onDispensar}
          title="Você pode reabrir o roteiro em Configurações."
        >
          <X className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">Dispensar</span>
          <span className="sm:hidden sr-only">Dispensar o roteiro</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-2 flex-1 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progresso.total}
          aria-valuenow={progresso.feitos}
          aria-label="Passos concluídos"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percentual}%` }} />
        </div>
        <span className="text-sm font-medium tabular-nums whitespace-nowrap">{textoDoProgresso(progresso)}</span>
      </div>

      <ol className="flex flex-col divide-y divide-border/60">
        {passos.map((passo, i) => {
          const proximo = progresso.proximo?.chave === passo.chave;
          return (
            <li key={passo.chave} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5",
                  passo.feito
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : proximo
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {passo.feito ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium break-words", passo.feito && "text-muted-foreground")}>
                    {passo.titulo}
                    {passo.opcional && <span className="ml-2 text-xs font-normal text-muted-foreground">(opcional)</span>}
                    <span className="sr-only">{passo.feito ? ": feito" : ": por fazer"}</span>
                  </p>
                  {!passo.feito && <p className="text-sm text-muted-foreground">{passo.explicacao}</p>}
                </div>
                {!passo.feito && <BotaoDoPasso passo={passo} destaque={proximo} onIrPara={onIrPara} onConvidar={onConvidar} />}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
