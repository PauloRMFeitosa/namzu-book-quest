import { Medal, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGamificacaoClube } from "@/hooks/gamificacao/useGamificacaoClube";

interface Props {
  clubeId: string;
}

/**
 * Liga semanal + nível do clube (Fase 4 da gamificação).
 * Renderizada no ClubeSidebar sob a flag show_gamificacao_clube.
 */
export const LigaSemanalClubeCard = ({ clubeId }: Props) => {
  const { data } = useGamificacaoClube(clubeId);
  if (!data) return null;

  const pctNivel = data.xp_proximo_nivel > 0
    ? Math.min(100, Math.round((data.xp_total / data.xp_proximo_nivel) * 100))
    : 0;

  return (
    <div className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Medal className="w-4 h-4 text-accent" />
        <h3 className="font-display font-semibold text-sm">Liga semanal</h3>
      </div>

      {/* Nível do clube */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Nível do clube {data.nivel}</span>
            <span className="text-muted-foreground tabular-nums">
              {data.xp_total}/{data.xp_proximo_nivel} XP
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-warm rounded-full transition-all"
              style={{ width: `${pctNivel}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ranking da semana */}
      {data.liga.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Ninguém pontuou nesta semana ainda. Conclua leituras e participe para pontuar!
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {data.liga.slice(0, 5).map((e) => (
            <li
              key={e.user_id}
              className={`flex items-center gap-2 rounded-md px-1 ${e.isMe ? "bg-secondary/60" : ""}`}
            >
              <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">
                {e.posicao}
              </span>
              <Avatar className="w-7 h-7">
                <AvatarImage src={e.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {e.nome.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-xs truncate">
                {e.nome}
                {e.isMe && <span className="text-muted-foreground"> (você)</span>}
              </span>
              <span className="text-[10px] text-accent font-semibold tabular-nums">
                {e.xp_na_semana} XP
              </span>
            </li>
          ))}
        </ol>
      )}
      {data.minhaPosicao && data.minhaPosicao > 5 && (
        <p className="text-[10px] text-muted-foreground">
          Você está em {data.minhaPosicao}º nesta semana.
        </p>
      )}
    </div>
  );
};
