import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { ClubeHeader } from "@/components/clubes/header/ClubeHeader";
import { ClubeSidebar } from "@/components/clubes/header/ClubeSidebar";
import { FeedClube } from "@/components/clubes/feed/FeedClube";
import { LeiturasTab } from "@/components/clubes/leituras/LeiturasTab";
import { CanaisTab } from "@/components/clubes/canais/CanaisTab";
import { EventosTab } from "@/components/clubes/eventos/EventosTab";
import { MicrogruposTab } from "@/components/clubes/microgrupos/MicrogruposTab";
import { MembrosTab } from "@/components/clubes/membros/MembrosTab";
import { ConteudosTab } from "@/components/clubes/conteudos/ConteudosTab";
import { GestaoTab } from "@/components/clubes/gestao/GestaoTab";
import {
  useClube,
  useClubeMembership,
  useEntrarClube,
  useSairClube,
} from "@/hooks/clubes/useClube";
import { useIsCurador } from "@/hooks/clubes/useClubeGestao";
import { useFeatureFlags, type FeatureFlagKey } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const BASE_TABS: { value: string; label: string; flag: FeatureFlagKey }[] = [
  { value: "feed", label: "Feed", flag: "show_clube_feed" },
  { value: "leituras", label: "Leituras", flag: "show_clube_leituras" },
  { value: "canais", label: "Canais", flag: "show_clube_canais" },
  { value: "eventos", label: "Eventos", flag: "show_clube_eventos" },
  { value: "membros", label: "Membros", flag: "show_clube_membros" },
  { value: "conteudos", label: "Conteúdos", flag: "show_clube_conteudos" },
  { value: "microgrupos", label: "Microgrupos", flag: "show_clube_microgrupos" },
];

const ClubeDetalhe = () => {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const tab = search.get("tab") ?? "feed";

  const { data: clube, isLoading } = useClube(id);
  const { data: membership } = useClubeMembership(id);
  const entrar = useEntrarClube(id);
  const sair = useSairClube(id);
  const { canManage } = useIsCurador(id, clube?.curador_id);
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  const acessoTotal = membership?.status === "ativo" || canManage;
  const visibleBase = BASE_TABS.filter((t) => isAdmin || flags[t.flag]);
  const TABS = canManage ? [...visibleBase, { value: "gestao", label: "Gestão", flag: "show_clubes" as FeatureFlagKey }] : visibleBase;
  const isTabVisible = (v: string) => TABS.some((t) => t.value === v);
  const activeTab = isTabVisible(tab) ? tab : (TABS[0]?.value ?? "feed");

  if (!id) return <Navigate to="/clubes" replace />;

  return (
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
              isMembro={acessoTotal}
              isPendente={membership?.status === "pendente"}
              onEntrar={() => entrar.mutate(clube.visibilidade === "privado" ? "pendente" : "ativo")}
              onSair={() => sair.mutate()}
              loading={entrar.isPending || sair.isPending}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              <Tabs
                value={activeTab}
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

                {isTabVisible("feed") && (
                  <TabsContent value="feed" className="mt-5">
                    <FeedClube
                      clubeId={clube.id}
                      isMembro={acessoTotal}
                      curadorId={clube.curador_id}
                      canManage={canManage}
                    />
                  </TabsContent>
                )}
                {isTabVisible("leituras") && (
                  <TabsContent value="leituras" className="mt-5">
                    <LeiturasTab clubeId={clube.id} isMembro={acessoTotal} />
                  </TabsContent>
                )}
                {isTabVisible("canais") && (
                  <TabsContent value="canais" className="mt-5">
                    <CanaisTab
                      clubeId={clube.id}
                      curadorId={clube.curador_id}
                      isMembro={acessoTotal}
                    />
                  </TabsContent>
                )}
                {isTabVisible("eventos") && (
                  <TabsContent value="eventos" className="mt-5">
                    <EventosTab
                      clubeId={clube.id}
                      curadorId={clube.curador_id}
                      isMembro={acessoTotal}
                    />
                  </TabsContent>
                )}
                {isTabVisible("membros") && (
                  <TabsContent value="membros" className="mt-5">
                    <MembrosTab
                      clubeId={clube.id}
                      curadorId={clube.curador_id}
                      isMembro={acessoTotal}
                    />
                  </TabsContent>
                )}
                {isTabVisible("conteudos") && (
                  <TabsContent value="conteudos" className="mt-5">
                    <ConteudosTab
                      clubeId={clube.id}
                      curadorId={clube.curador_id}
                      isMembro={acessoTotal}
                    />
                  </TabsContent>
                )}
                {isTabVisible("microgrupos") && (
                  <TabsContent value="microgrupos" className="mt-5">
                    <MicrogruposTab clubeId={clube.id} isMembro={acessoTotal} />
                  </TabsContent>
                )}
                {canManage && (
                  <TabsContent value="gestao" className="mt-5">
                    <GestaoTab clubeId={clube.id} curadorId={clube.curador_id} />
                  </TabsContent>
                )}
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
