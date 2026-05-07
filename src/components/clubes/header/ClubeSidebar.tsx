import { useRankingClube, useProximosEventos } from "@/hooks/clubes/useClube";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Calendar, Flame, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  clubeId: string;
  membrosCount: number;
  ativos7d: number;
  ativos30d: number;
}

export const ClubeSidebar = ({ clubeId, membrosCount, ativos7d, ativos30d }: Props) => {
  const { data: ranking = [] } = useRankingClube(clubeId);
  const { data: eventos = [] } = useProximosEventos(clubeId);
  const pctAtivos = membrosCount > 0 ? Math.round((ativos7d / membrosCount) * 100) : 0;

  return (
    <aside className="flex flex-col gap-4">
      {/* Pulso coletivo */}
      <div className="card-soft p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="font-display font-semibold text-sm">Pulso coletivo</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Membros" value={membrosCount} />
          <Stat label="Ativos 7d" value={ativos7d} />
          <Stat label="Ativos 30d" value={ativos30d} />
        </div>
        {membrosCount > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Engajamento semanal</span>
              <span className="font-semibold text-foreground">{pctAtivos}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-warm rounded-full transition-all"
                style={{ width: `${Math.min(100, pctAtivos)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Ranking */}
      <div className="card-soft p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <h3 className="font-display font-semibold text-sm">Ranking</h3>
        </div>
        {ranking.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranking.map((r: any, i) => (
              <li key={r.user_id} className="flex items-center gap-2">
                <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <Avatar className="w-7 h-7">
                  <AvatarImage src={r.perfil?.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {(r.perfil?.nome_exibicao ?? "U").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-xs truncate">
                  {r.perfil?.nome_exibicao || r.perfil?.username || "Membro"}
                </span>
                <span className="text-[10px] flex items-center gap-0.5 text-accent font-semibold">
                  <Flame className="w-3 h-3" /> {r.xp}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Próximos eventos */}
      <div className="card-soft p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h3 className="font-display font-semibold text-sm">Próximos eventos</h3>
        </div>
        {eventos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum evento marcado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {eventos.map((e: any) => (
              <li key={e.id} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium truncate">{e.titulo}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(e.inicio_em), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col">
    <span className="font-display text-lg font-semibold">{value}</span>
    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
  </div>
);
