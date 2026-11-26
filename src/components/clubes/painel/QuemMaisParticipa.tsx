import { Flame, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LigaSemanalClubeCard } from "@/components/gamificacao/LigaSemanalClubeCard";
import { useRankingClube } from "@/hooks/clubes/useClube";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Ranking do clube e, com a gamificação do clube ligada, a liga semanal.
 * Fica na aba Membros. Não aparece enquanto não há o que mostrar.
 */
export const QuemMaisParticipa = ({ clubeId }: { clubeId: string }) => {
  const { data: ranking = [] } = useRankingClube(clubeId);
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  const mostraLiga = isAdmin || flags.show_gamificacao_clube;

  if (!mostraLiga && ranking.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="Quem mais participa">
      <h3 className="font-display font-semibold text-sm">Quem mais participa</h3>
      <div className="grid sm:grid-cols-2 gap-3 items-start">
        {ranking.length > 0 && (
          <div className="card-soft p-4 flex flex-col gap-3">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" /> Ranking
            </h4>
            <ol className="flex flex-col gap-2">
              {ranking.map((r: any, i: number) => (
                <li key={r.user_id} className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={r.perfil?.avatar_url} />
                    <AvatarFallback className="text-[10px]">{(r.perfil?.nome_exibicao ?? "U").slice(0, 1)}</AvatarFallback>
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
          </div>
        )}
        {mostraLiga && <LigaSemanalClubeCard clubeId={clubeId} />}
      </div>
    </section>
  );
};
