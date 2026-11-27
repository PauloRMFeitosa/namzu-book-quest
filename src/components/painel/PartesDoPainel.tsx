import type { ReactNode } from "react";
import { RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROTULO_DA_SITUACAO, picoDaSerie, type SituacaoDoClube } from "@/lib/adminPainel";
import { cn } from "@/lib/utils";

// Peças das telas de acompanhamento: Admin (Painel, Métricas, Clubes) e
// painel do organizador.

export const PERIODOS = [
  { dias: 7, label: "7 dias" },
  { dias: 14, label: "14 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "90 dias" },
];

export const SeletorDePeriodo = ({
  dias,
  onMudar,
  atualizando,
  onAtualizar,
}: {
  dias: number;
  onMudar: (dias: number) => void;
  atualizando?: boolean;
  onAtualizar?: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Período">
      {PERIODOS.map((p) => (
        <button
          key={p.dias}
          type="button"
          aria-pressed={dias === p.dias}
          onClick={() => onMudar(p.dias)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            dias === p.dias ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
    {onAtualizar && (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onAtualizar} disabled={atualizando}>
        <RefreshCw className={cn("w-4 h-4", atualizando && "animate-spin")} /> Atualizar
      </Button>
    )}
  </div>
);

export const Indicador = ({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  sufixo,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
  icone: LucideIcon;
  /** Unidade colada ao número, ex.: "%". */
  sufixo?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1 min-w-0">
    <div className="flex items-center justify-between gap-2 text-muted-foreground">
      <span className="text-xs font-medium uppercase tracking-wide truncate">{rotulo}</span>
      <Icone className="w-4 h-4 shrink-0" aria-hidden="true" />
    </div>
    <p className="font-display text-3xl font-semibold tabular-nums leading-tight">{valor.toLocaleString("pt-BR")}
      {sufixo}
    </p>
    {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
  </div>
);

export const Bloco = ({
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn("rounded-xl border border-border bg-card p-4 flex flex-col gap-3 min-w-0", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold">{titulo}</h3>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
    {children}
  </section>
);

const CORES_DA_SITUACAO: Record<SituacaoDoClube, string> = {
  em_uso: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  parado: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  sem_uso: "bg-muted text-muted-foreground",
  desativado: "bg-muted text-muted-foreground line-through decoration-muted-foreground/50",
};

export const SeloDaSituacao = ({ situacao }: { situacao: SituacaoDoClube }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", CORES_DA_SITUACAO[situacao])}>
    {ROTULO_DA_SITUACAO[situacao]}
  </span>
);

const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/**
 * Ações por dia, em barras. Uma série só, na cor principal; o valor aparece
 * ao passar o mouse ou focar a barra, e a mesma informação vai em tabela
 * para leitor de tela.
 */
export const BarrasPorDia = ({ serie, rotulo }: { serie: { dia: string; total: number }[]; rotulo: string }) => {
  const pico = picoDaSerie(serie);
  const total = serie.reduce((soma, p) => soma + p.total, 0);
  // Mostra no eixo só alguns dias, para os rótulos não se atropelarem.
  const passo = Math.max(1, Math.ceil(serie.length / 7));

  if (serie.length === 0 || total === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma ação registrada neste período.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-[2px] h-40" role="img" aria-label={`${rotulo}: ${total} no período, pico de ${pico} em um dia`}>
        {serie.map((p) => (
          <Tooltip key={p.dia}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="group flex-1 min-w-0 h-full flex items-end justify-center focus-visible:outline-none"
                aria-label={`${diaCurto(p.dia)}: ${p.total}`}
              >
                <span
                  className={cn(
                    "w-full max-w-8 rounded-t-[4px] transition-colors",
                    p.total > 0 ? "bg-primary/85 group-hover:bg-primary group-focus-visible:bg-primary" : "bg-border",
                  )}
                  style={{ height: p.total > 0 ? `${Math.max(3, (p.total / pico) * 100)}%` : "2px" }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-medium tabular-nums">{p.total}</span> em {diaCurto(p.dia)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex gap-[2px] text-[10px] text-muted-foreground tabular-nums" aria-hidden="true">
        {serie.map((p, i) => (
          <span key={p.dia} className="flex-1 min-w-0 text-center overflow-visible whitespace-nowrap">
            {i % passo === 0 || i === serie.length - 1 ? diaCurto(p.dia) : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{rotulo}</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {serie.map((p) => (
            <tr key={p.dia}>
              <td>{diaCurto(p.dia)}</td>
              <td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ErroDoPainel = ({ erro }: { erro: unknown }) => (
  <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
    Não foi possível carregar os números: {(erro as { message?: string })?.message ?? "erro desconhecido"}
  </p>
);
