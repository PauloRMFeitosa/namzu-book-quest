import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Users, ExternalLink, Check, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventoClube, useRsvp } from "@/hooks/clubes/useEventos";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  encontro: "Encontro",
  live: "Live",
  workshop: "Workshop",
  leitura_coletiva: "Leitura coletiva",
};

export const EventoCard = ({
  evento,
  isMembro,
  clubeId,
}: {
  evento: EventoClube;
  isMembro: boolean;
  clubeId: string;
}) => {
  const rsvp = useRsvp(clubeId);
  const inicio = new Date(evento.inicio_em);
  const passado = inicio < new Date();
  const lotado =
    evento.limite_participantes != null &&
    evento.participantes_count >= evento.limite_participantes;

  const setStatus = (status: "confirmado" | "talvez" | "recusado") => {
    const next = evento.meu_status === status ? null : status;
    rsvp.mutate({ eventoId: evento.id, status: next });
  };

  return (
    <article
      className={cn(
        "card-soft p-4 flex flex-col gap-3 border border-border/60 transition-all",
        passado && "opacity-60"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl bg-gradient-paper border border-border/60">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {format(inicio, "MMM", { locale: ptBR })}
          </span>
          <span className="font-display text-2xl font-semibold leading-none">
            {format(inicio, "dd")}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {format(inicio, "HH:mm")}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            {evento.tipo && (
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wider">
                {TIPO_LABEL[evento.tipo] ?? evento.tipo}
              </Badge>
            )}
            {passado && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                Encerrado
              </Badge>
            )}
            {lotado && !passado && (
              <Badge className="rounded-full text-[10px] bg-destructive text-destructive-foreground">
                Lotado
              </Badge>
            )}
          </div>
          <h3 className="font-display text-base font-semibold truncate">
            {evento.titulo}
          </h3>
          {evento.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {evento.descricao}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(inicio, "dd 'de' MMM, yyyy", { locale: ptBR })}
            </span>
            {evento.fim_em && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                até {format(new Date(evento.fim_em), "HH:mm")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {evento.participantes_count}
              {evento.limite_participantes ? ` / ${evento.limite_participantes}` : ""} confirmados
            </span>
          </div>
        </div>
      </div>

      {(isMembro || evento.url_evento) && !passado && (
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40">
          {isMembro && (
            <>
              <Button
                size="sm"
                variant={evento.meu_status === "confirmado" ? "default" : "outline"}
                onClick={() => setStatus("confirmado")}
                disabled={rsvp.isPending || (lotado && evento.meu_status !== "confirmado")}
                className="rounded-xl h-8"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Vou
              </Button>
              <Button
                size="sm"
                variant={evento.meu_status === "talvez" ? "default" : "outline"}
                onClick={() => setStatus("talvez")}
                disabled={rsvp.isPending}
                className="rounded-xl h-8"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1" /> Talvez
              </Button>
              <Button
                size="sm"
                variant={evento.meu_status === "recusado" ? "default" : "ghost"}
                onClick={() => setStatus("recusado")}
                disabled={rsvp.isPending}
                className="rounded-xl h-8"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Não
              </Button>
            </>
          )}
          {evento.url_evento && (
            <a
              href={evento.url_evento}
              target="_blank"
              rel="noreferrer"
              className="ml-auto"
            >
              <Button size="sm" variant="ghost" className="rounded-xl h-8">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir link
              </Button>
            </a>
          )}
        </div>
      )}
    </article>
  );
};
