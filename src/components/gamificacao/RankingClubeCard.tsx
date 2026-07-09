import { useNavigate } from "react-router-dom";
import { Crown, Flame } from "lucide-react";
import { useRankingClube } from "@/hooks/gamificacao/useRankingClube";

const MEDALS = ["🥇", "🥈", "🥉"];

export const RankingClubeCard = () => {
  const { data } = useRankingClube();
  const navigate = useNavigate();
  if (!data || !data.top?.length) return null;

  return (
    <div className="card-soft p-5 h-full shrink-0 w-[78%] snap-start md:w-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            Ranking do clube
          </p>
          <p className="font-bold leading-tight truncate">{data.clube.nome}</p>
        </div>
        <button
          onClick={() => navigate(`/clubes/${data.clube.id}`)}
          className="text-xs text-primary font-medium shrink-0"
        >
          Ver clube
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {data.top.map((r: any) => (
          <div
            key={r.user_id}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl ${r.isMe ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
          >
            <span className="w-6 text-center text-base">
              {MEDALS[r.posicao - 1] ?? <span className="text-xs text-muted-foreground">{r.posicao}º</span>}
            </span>
            <Crown className={`w-4 h-4 ${r.posicao === 1 ? "text-yellow-500" : "text-muted-foreground"}`} />
            <span className="flex-1 font-medium truncate text-sm">{r.nome}</span>
            <span className="text-sm font-bold tabular-nums">{r.xp} XP</span>
            <span className="flex items-center gap-0.5 text-xs text-orange-500 tabular-nums">
              <Flame className="w-3 h-3" />
              {r.streak}
            </span>
          </div>
        ))}
        {data.minhaPosicao && data.minhaPosicao > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-1">
            Sua posição: <span className="font-semibold text-foreground">{data.minhaPosicao}º</span>
          </p>
        )}
      </div>
    </div>
  );
};
