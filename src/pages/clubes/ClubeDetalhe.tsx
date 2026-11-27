import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams, Navigate } from "react-router-dom";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { BarraDeAbasClube } from "@/components/clubes/header/BarraDeAbasClube";
import { ClubeHeader } from "@/components/clubes/header/ClubeHeader";
import { FeedClube } from "@/components/clubes/feed/FeedClube";
import { LeiturasTab } from "@/components/clubes/leituras/LeiturasTab";
import { CanaisTab } from "@/components/clubes/canais/CanaisTab";
import { EventosTab } from "@/components/clubes/eventos/EventosTab";
import { AvisosClube } from "@/components/clubes/avisos/AvisosClube";
import { MicrogruposTab } from "@/components/clubes/microgrupos/MicrogruposTab";
import { MembrosTab } from "@/components/clubes/membros/MembrosTab";
import { ConteudosTab } from "@/components/clubes/conteudos/ConteudosTab";
import { ConvidarMembrosDialog } from "@/components/clubes/convite/ConvidarMembrosDialog";
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
  const tabPedida = search.get("tab");

  // ?convidar=1 vem da criação do clube: abre o link de convite de primeira.
  const [recemCriado] = useState(() => search.get("convidar") === "1");
  const [convidarAberto, setConvidarAberto] = useState(recemCriado);
  const fecharConvite = (aberto: boolean) => {
    setConvidarAberto(aberto);
    if (!aberto && search.get("convidar")) {
      const proximo = new URLSearchParams(search);
      proximo.delete("convidar");
      setSearch(proximo, { replace: true });
    }
  };

  // ?avisos=1 vem da notificação de aviso: abre a lista de avisos de primeira.
  const [abrirAvisos, setAbrirAvisos] = useState(() => search.get("avisos") === "1");
  const avisosAbertos = useCallback(() => {
    setAbrirAvisos(false);
    setSearch(
      (atual) => {
        const proximo = new URLSearchParams(atual);
        proximo.delete("avisos");
        return proximo;
      },
      { replace: true },
    );
  }, [setSearch]);

  const { data: clube, isLoading, isFetching, refetch } = useClube(id);
  const { data: membership, isLoading: carregandoParticipacao } = useClubeMembership(id);
  const entrar = useEntrarClube(id);
  const sair = useSairClube(id);
  const { canManage } = useIsCurador(id, clube?.curador_id);
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  const acessoTotal = membership?.status === "ativo" || canManage;
  const visibleBase = BASE_TABS.filter((t) => isAdmin || flags[t.flag]);
  // A gestão fica no painel do organizador; aqui são só as abas dos membros.
  const TABS = visibleBase;
  const isTabVisible = (v: string) => TABS.some((t) => t.value === v);
  const tab = tabPedida ?? "feed";
  const activeTab = isTabVisible(tab) ? tab : (TABS[0]?.value ?? "feed");
  const irParaAba = (aba: string) => {
    const proximo = new URLSearchParams(search);
    proximo.set("tab", aba);
    setSearch(proximo, { replace: true });
  };

  // Clube privado só aparece para quem faz parte. Se a consulta não devolve o
  // clube, quem ainda não entrou (ou está pendente) vai para o convite.
  // Membro ativo com resultado vazio pode estar vendo cache de antes da
  // aprovação: recarrega uma vez antes de desistir.
  const clubeAusente = !isLoading && !isFetching && !clube;
  const souMembroAtivo = membership?.status === "ativo";
  const tentouRecarregar = useRef(false);
  useEffect(() => {
    if (clubeAusente && souMembroAtivo && !tentouRecarregar.current) {
      tentouRecarregar.current = true;
      refetch();
    }
  }, [clubeAusente, souMembroAtivo, refetch]);

  if (!id) return <Navigate to="/clubes" replace />;

  // As abas Visão geral e Gestão viraram o painel do organizador: quem chega
  // por um link antigo vai para lá.
  if (canManage && (tabPedida === "visao" || tabPedida === "gestao")) {
    return <Navigate to={`/clubes/${id}/painel?secao=${tabPedida === "gestao" ? "leitura" : "visao"}`} replace />;
  }

  if (clubeAusente && !carregandoParticipacao) {
    if (!souMembroAtivo) return <Navigate to={`/convite/${id}`} replace />;
    if (tentouRecarregar.current) return <Navigate to="/" replace />;
  }

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
              onConvidar={() => setConvidarAberto(true)}
              loading={entrar.isPending || sair.isPending}
            />

            {canManage && (
              <Link
                to={`/clubes/${clube.id}/painel`}
                className="card-soft px-4 py-3 flex items-center gap-3 border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm">Painel do organizador</span>
                  <span className="block text-sm text-muted-foreground">Membros, leitura, encontros e avisos em um lugar só.</span>
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
              </Link>
            )}

            {acessoTotal && (
              <AvisosClube
                clubeId={clube.id}
                nomeClube={clube.nome}
                podeGerir={canManage}
                abrirLista={abrirAvisos}
                onListaAberta={avisosAbertos}
              />
            )}

              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  const next = new URLSearchParams(search);
                  next.set("tab", v);
                  setSearch(next, { replace: true });
                }}
              >
                <BarraDeAbasClube abas={TABS} ativa={activeTab} onEscolher={irParaAba} />

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
                      nomeClube={clube.nome}
                    />
                  </TabsContent>
                )}
                {isTabVisible("membros") && (
                  <TabsContent value="membros" className="mt-5">
                    <MembrosTab
                      clubeId={clube.id}
                      curadorId={clube.curador_id}
                      isMembro={acessoTotal}
                      nomeClube={clube.nome}
                      pulso={{ membros: clube.membros_count, ativos7d: clube.ativos_7d, ativos30d: clube.ativos_30d }}
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
              </Tabs>

            <ConvidarMembrosDialog
              open={convidarAberto}
              onOpenChange={fecharConvite}
              clubeId={clube.id}
              nomeClube={clube.nome}
              privado={clube.visibilidade === "privado"}
              recemCriado={recemCriado && canManage}
            />
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
