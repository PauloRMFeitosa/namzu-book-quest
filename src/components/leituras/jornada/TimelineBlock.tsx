import { Activity, BookOpen, Lightbulb, Target, Quote, Sparkles, Award, Check } from "lucide-react";
import { useTimelineLivro, type TimelineEvent } from "@/hooks/leituras/useTimelineLivro";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";

const ICONS: Record<TimelineEvent["tipo"], React.ReactNode> = {
  progresso: <BookOpen className="w-3.5 h-3.5" />,
  insight: <Lightbulb className="w-3.5 h-3.5" />,
  aplicacao: <Target className="w-3.5 h-3.5" />,
  citacao: <Quote className="w-3.5 h-3.5" />,
  pre_leitura: <Sparkles className="w-3.5 h-3.5" />,
  pos_leitura: <Award className="w-3.5 h-3.5" />,
  conclusao: <Check className="w-3.5 h-3.5" />,
};

export const TimelineBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const { data: events = [], isLoading } = useTimelineLivro(livro);

  return (
    <section className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Timeline</h2>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-xs text-muted-foreground">Sua jornada aparecerá aqui.</p>
      )}

      <ol className="flex flex-col gap-2.5">
        {events.map((e) => (
          <li key={e.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                {ICONS[e.tipo]}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{e.titulo}</p>
              {e.detalhe && <p className="text-xs text-muted-foreground line-clamp-2">{e.detalhe}</p>}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {new Date(e.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
