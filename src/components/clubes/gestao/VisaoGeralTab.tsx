import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, BookOpen, CalendarDays, ChevronRight, UserCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useVisaoGeralClube } from "@/hooks/clubes/useVisaoGeralClube";
import {
  filtrarMembros,
  resumoLeitura,
  resumoRespostas,
  rotuloUltimaAtividade,
  textoResumoLeitura,
  type FiltroMembros,
  type MembroVisaoGeral,
} from "@/lib/visaoGeral";
import { cn } from "@/lib/utils";

interface Props {
  clubeId: string;
  /** Leva o organizador para outra aba do clube. */
  onIrPara: (aba: string) => void;
}

const ROTULO_RSVP: Record<NonNullable<MembroVisaoGeral["rsvp"]>, string> = {
  confirmado: "Vai ao encontro",
  talvez: "Talvez vá",
  recusado: "Não vai",
};

// Primeira tela do organizador dentro do clube (Fase 3): o que substitui a
// planilha e as perguntas no grupo.
export const VisaoGeralTab = ({ clubeId, onIrPara }: Props) => {
  const { data, isLoading, isError, refetch } = useVisaoGeralClube(clubeId);
  const [filtro, setFiltro] = useState<FiltroMembros>("todos");

  const leitura = useMemo(() => resumoLeitura(data?.membros ?? []), [data?.membros]);
  const membros = useMemo(() => filtrarMembros(data?.membros ?? [], filtro), [data?.membros, filtro]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-soft p-6 text-center flex flex-col items-center gap-3">
        <p className="font-semibold">Não foi possível carregar a visão geral</p>
        <Button variant="outline" className="rounded-xl" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const encontro = data.proximo_encontro;
  const livro = data.livro_atual;
  const naoComecaram = filtrarMembros(data.membros, "nao_iniciou").length;

  const filtros: { valor: FiltroMembros; rotulo: string; total: number }[] = [
    { valor: "todos", rotulo: "Todos", total: data.membros_ativos },
    { valor: "parados", rotulo: "Parados", total: data.parados },
    { valor: "nao_iniciou", rotulo: "Não começaram", total: naoComecaram },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Pedidos de entrada: só aparece quando há algo a fazer */}
      {data.pedidos_pendentes > 0 && (
        <button
          onClick={() => onIrPara("membros")}
          className="card-soft p-4 flex items-center gap-3 text-left border border-accent/40 bg-accent/5 hover-lift"
        >
          <UserCheck className="w-5 h-5 text-accent shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {data.pedidos_pendentes === 1
                ? "1 pessoa pediu para entrar"
                : `${data.pedidos_pendentes} pessoas pediram para entrar`}
            </p>
            <p className="text-xs text-muted-foreground">Aprovar ou recusar na aba Membros</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Próximo encontro */}
        <section className="card-soft p-4 flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <CalendarDays className="w-4 h-4 text-primary" /> Próximo encontro
          </h3>
          {encontro ? (
            <>
              <p className="font-semibold leading-tight">{encontro.titulo}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(encontro.inicio_em), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
              <p className="text-sm">{resumoRespostas(encontro)}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Nenhum encontro marcado.</p>
              <Button variant="outline" size="sm" className="rounded-xl self-start" onClick={() => onIrPara("eventos")}>
                Marcar encontro
              </Button>
            </>
          )}
        </section>

        {/* Livro atual */}
        <section className="card-soft p-4 flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <BookOpen className="w-4 h-4 text-primary" /> Livro atual
          </h3>
          {livro ? (
            <div className="flex gap-3">
              {livro.capa_url ? (
                <img src={livro.capa_url} alt="" className="w-12 h-16 rounded object-cover shadow-soft shrink-0" />
              ) : (
                <div className="w-12 h-16 rounded bg-secondary flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold leading-tight line-clamp-2">{livro.titulo}</p>
                <p className="text-sm text-muted-foreground mt-1">{textoResumoLeitura(leitura)}</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">O clube ainda não tem um livro definido.</p>
              <Button variant="outline" size="sm" className="rounded-xl self-start" onClick={() => onIrPara("gestao")}>
                Definir livro
              </Button>
            </>
          )}
        </section>
      </div>

      {/* Membros */}
      <section className="card-soft p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <Users className="w-4 h-4 text-primary" /> Membros
          </h3>
          {data.parados > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-accent">
              <AlertTriangle className="w-3.5 h-3.5" />
              {data.parados === 1 ? "1 parado há 7 dias" : `${data.parados} parados há 7 dias`}
            </span>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Filtrar membros">
          {filtros.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                filtro === f.valor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.rotulo} ({f.total})
            </button>
          ))}
        </div>

        {data.membros_ativos === 0 ? (
          <div className="text-center py-6 flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Ainda não há membros. Convide as pessoas pelo link do clube.</p>
          </div>
        ) : membros.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {filtro === "parados" ? "Ninguém parado. Todos tiveram atividade nos últimos 7 dias." : "Todos já começaram o livro."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/50">
            {membros.map((m) => (
              <li key={m.user_id} className="py-3 flex items-start gap-3">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {(m.nome ?? "M").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{m.nome ?? "Membro"}</p>
                    {m.organizador && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">Organizador</span>
                    )}
                    {!m.organizador && m.papel === "moderador" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-medium">Moderador</span>
                    )}
                    {m.parado && (
                      <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-medium">Parado</span>
                    )}
                  </div>
                  {m.percentual !== null && (
                    <div className="flex items-center gap-2">
                      <Progress value={m.percentual} className="h-1.5 flex-1" aria-label={`Progresso de ${m.nome ?? "membro"}`} />
                      <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">{m.percentual}%</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {rotuloUltimaAtividade(m.ultima_atividade)}
                    {encontro && m.rsvp ? ` · ${ROTULO_RSVP[m.rsvp]}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
