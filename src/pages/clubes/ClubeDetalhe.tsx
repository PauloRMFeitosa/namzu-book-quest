import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/AppLayout";
import { ClubeHeader } from "@/components/clubes/header/ClubeHeader";
import { ClubeSidebar } from "@/components/clubes/header/ClubeSidebar";
import { FeedClube } from "@/components/clubes/feed/FeedClube";
import { LeiturasTab } from "@/components/clubes/leituras/LeiturasTab";
import { CanaisTab } from "@/components/clubes/canais/CanaisTab";
import { EventosTab } from "@/components/clubes/eventos/EventosTab";
import { MicrogruposTab } from "@/components/clubes/microgrupos/MicrogruposTab";
import {
  useClube,
  useClubeMembership,
  useEntrarClube,
  useSairClube,
} from "@/hooks/clubes/useClube";

const TABS = [
  { value: "feed", label: "Feed" },
  { value: "leituras", label: "Leituras" },
  { value: "canais", label: "Canais" },
  { value: "eventos", label: "Eventos" },
  { value: "membros", label: "Membros" },
  { value: "conteudos", label: "Conteúdos" },
  { value: "microgrupos", label: "Microgrupos" },
];

const ClubeDetalhe = () => {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const tab = search.get("tab") ?? "feed";

  const { data: clube, isLoading } = useClube(id);
  const { data: membership } = useClubeMembership(id);
  const entrar = useEntrarClube(id);
  const sair = useSairClube(id);

  if (!id) return <Navigate to="/clubes" replace />;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-8">
        {isLoading || !clube ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-44 sm:h-56 rounded-[var(--radius)]" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <ClubeHeader
              clube={clube}
              isMembro={!!membership}
              onEntrar={() => entrar.mutate()}
              onSair={() => sair.mutate()}
              loading={entrar.isPending || sair.isPending}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              <Tabs
                value={tab}
                onValueChange={(v) => {
                  const next = new URLSearchParams(search);
                  next.set("tab", v);
                  setSearch(next, { replace: true });
                }}
              >
                <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
                  <TabsList className="w-max h-10 bg-muted/60 p-1 rounded-2xl">
                    {TABS.map((t) => (
                      <TabsTrigger
                        key={t.value}
                        value={t.value}
                        className="rounded-xl text-xs font-medium px-3"
                      >
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <TabsContent value="feed" className="mt-5">
                  <FeedClube clubeId={clube.id} isMembro={!!membership} />
                </TabsContent>
                <TabsContent value="leituras" className="mt-5">
                  <LeiturasTab clubeId={clube.id} isMembro={!!membership} />
                </TabsContent>
                <TabsContent value="canais" className="mt-5">
                  <CanaisTab
                    clubeId={clube.id}
                    curadorId={clube.curador_id}
                    isMembro={!!membership}
                  />
                </TabsContent>
                <TabsContent value="eventos" className="mt-5">
                  <EventosTab
                    clubeId={clube.id}
                    curadorId={clube.curador_id}
                    isMembro={!!membership}
                  />
                </TabsContent>
                <TabsContent value="membros" className="mt-5">
                  <PlaceholderTab
                    titulo="Membros"
                    descricao="Quem faz parte desta tribo intelectual."
                    fase="Fase 8"
                  />
                </TabsContent>
                <TabsContent value="conteudos" className="mt-5">
                  <PlaceholderTab
                    titulo="Conteúdos"
                    descricao="Material exclusivo curado para os membros."
                    fase="Fase 8"
                  />
                </TabsContent>
                <TabsContent value="microgrupos" className="mt-5">
                  <MicrogruposTab clubeId={clube.id} isMembro={!!membership} />
                </TabsContent>
              </Tabs>

              <ClubeSidebar
                clubeId={clube.id}
                membrosCount={clube.membros_count}
                ativos7d={clube.ativos_7d}
                ativos30d={clube.ativos_30d}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const PlaceholderTab = ({
  titulo,
  descricao,
  fase,
}: {
  titulo: string;
  descricao: string;
  fase: string;
}) => (
  <div className="card-soft p-8 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
    <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">
      {fase}
    </span>
    <h3 className="font-display text-lg font-semibold">{titulo}</h3>
    <p className="text-sm text-muted-foreground max-w-md">{descricao}</p>
  </div>
);

export default ClubeDetalhe;
