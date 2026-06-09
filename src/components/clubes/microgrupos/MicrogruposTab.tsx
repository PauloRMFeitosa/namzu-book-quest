import { useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMicrogrupos } from "@/hooks/clubes/useMicrogrupos";
import { MicrogrupoCard } from "./MicrogrupoCard";
import { CriarMicrogrupoDialog } from "./CriarMicrogrupoDialog";
import { MatchmakingIA } from "@/components/clubes/ai/MatchmakingIA";

export const MicrogruposTab = ({
  clubeId,
  isMembro,
}: {
  clubeId: string;
  isMembro: boolean;
}) => {
  const { data: grupos, isLoading } = useMicrogrupos(clubeId);
  const [criarOpen, setCriarOpen] = useState(false);

  if (!isMembro) {
    return (
      <div className="card-soft p-8 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
        <UsersRound className="w-8 h-8 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold">Microgrupos</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Entre no clube para descobrir e criar microgrupos — pequenas tribos íntimas
          dentro deste universo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Microgrupos</h2>
          <p className="text-xs text-muted-foreground">
            Tribos pequenas e íntimas para conversas mais profundas.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MatchmakingIA clubeId={clubeId} />
          <Button
            onClick={() => setCriarOpen(true)}
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary-hover"
          >
            <Plus className="w-4 h-4" /> Criar
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : !grupos?.length ? (
        <div className="card-soft p-8 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
          <UsersRound className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-md">
            Ainda não há microgrupos neste clube. Seja o primeiro a criar uma tribo.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {grupos.map((g) => (
            <MicrogrupoCard
              key={g.id}
              grupo={g}
              clubeId={clubeId}
              isMembroClube={isMembro}
            />
          ))}
        </div>
      )}

      <CriarMicrogrupoDialog
        open={criarOpen}
        onOpenChange={setCriarOpen}
        clubeId={clubeId}
      />
    </div>
  );
};
