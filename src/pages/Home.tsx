import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GamificacaoHome } from "@/components/gamificacao/GamificacaoHome";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { IniciarCodigoMeCard } from "@/components/IniciarCodigoMeCard";
import { useLendoList } from "@/hooks/leituras/useMinhasLeituras";
import { useClubes } from "@/hooks/clubes/useClubes";
import { ClubeCard } from "@/components/clubes/marketplace/ClubeCard";
import { CarrosselHorizontal } from "@/components/CarrosselHorizontal";

import { BookOpen, Play, Plus, HomeIcon, Users, Rss, Library } from "lucide-react";
import { FeedAtividade } from "@/components/social/FeedAtividade";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const firstName = (user?.user_metadata?.full_name as string)?.split(" ")[0] || user?.email?.split("@")[0] || "leitor";

  const { data: lendo = [] } = useLendoList();

  const { data: ultimas = [] } = useQuery({
    queryKey: ["ultimas-leituras", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("*, obras(*)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  // Mesma consulta da página de Clubes (cache compartilhado); filtra membro ou curador
  const { data: todosClubes = [] } = useClubes();
  const meusClubes = useMemo(
    () =>
      todosClubes
        .filter((c) => c.is_membro || c.curador_id === user?.id)
        .sort((a, b) => Number(b.curador_id === user?.id) - Number(a.curador_id === user?.id)),
    [todosClubes, user?.id]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={HomeIcon}
        badge="Início"
        title={<>Olá, <span className="text-gradient-warm">{firstName}</span></>}
        description="Acompanhe suas leituras, conquistas e clubes."
      />

      {flags.show_gamificacao_home && <GamificacaoHome />}

      <IniciarCodigoMeCard />

      {/* Meus clubes — curadoria e participação unificadas; curador vem primeiro com badge */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Meus clubes</h3>
          </div>
          <button onClick={() => navigate("/clubes")} className="text-xs text-primary font-medium">Ver todos</button>
        </div>
        {meusClubes.length === 0 ? (
          <div className="card-soft p-6 text-center">
            <Users className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="font-semibold">Você ainda não participa de nenhum clube ativo</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Encontre uma comunidade que combina com você.</p>
            <Button onClick={() => navigate("/clubes")} className="h-[48px] rounded-2xl bg-primary hover:bg-primary-hover">
              Explorar clubes
            </Button>
          </div>
        ) : (
          <CarrosselHorizontal>
            {meusClubes.map((c) => (
              <ClubeCard key={c.id} clube={c} variant="carousel" ehCurador={c.curador_id === user?.id} />
            ))}
          </CarrosselHorizontal>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
            Em andamento {lendo.length > 0 && <span className="text-xs">({lendo.length})</span>}
          </h3>
          <button onClick={() => navigate("/leituras")} className="text-xs text-primary font-medium">Ver todos</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
          {lendo.map((l) => (
            <div
              key={l.usuario_leitura_id}
              className="card-soft p-3 flex-shrink-0 w-40 snap-start flex flex-col gap-2"
            >
              <button onClick={() => navigate(`/leituras/${l.usuario_leitura_id}`)} className="text-left flex flex-col gap-2">
                {l.capa_url ? (
                  <img src={l.capa_url} alt={l.titulo ?? ""} className="w-full h-40 rounded-lg object-cover shadow-soft" />
                ) : (
                  <div className="w-full h-40 rounded-lg bg-secondary flex items-center justify-center shadow-soft">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                )}
                <p className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">{l.titulo}</p>
                <div>
                  <Progress value={l.percentual} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{l.percentual}% concluído</p>
                </div>
              </button>
              <Button
                size="sm"
                onClick={() => navigate(`/leituras/${l.usuario_leitura_id}`)}
                className="w-full rounded-xl bg-primary hover:bg-primary-hover text-xs h-7 gap-1"
              >
                <Play className="w-3 h-3" /> Ler
              </Button>
            </div>
          ))}
          <button
            onClick={() => navigate("/busca")}
            className="card-soft p-3 hover-lift flex-shrink-0 w-40 snap-start flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-primary text-center">Adicionar leitura</p>
          </button>
        </div>
      </section>

      {/* Feed de atividade social */}
      <section className="card-soft p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Atividade dos leitores que sigo</h3>
          </div>
          <button onClick={() => navigate("/leitores")} className="text-xs text-primary font-medium">
            Descobrir
          </button>
        </div>
        <FeedAtividade limite={20} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Library className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Últimos livros adicionados</h3>
          </div>
          <button onClick={() => navigate("/livros")} className="text-xs text-primary font-medium">Ver todos</button>
        </div>
        {ultimas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum livro ainda.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {ultimas.map((l: any) => (
              <button key={l.id} onClick={() => navigate(`/obras/${l.obra_id}`)} className="flex-shrink-0 w-24 hover-lift flex flex-col">
                {l.obras?.capa_padrao_url ? (
                  <img src={l.obras.capa_padrao_url} alt="" className="w-24 h-32 rounded-lg object-cover shadow-soft" />
                ) : (
                  <div className="w-24 h-32 rounded-lg bg-secondary flex items-center justify-center shadow-soft">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                )}
                <p className="text-xs mt-1 line-clamp-2 break-words font-medium min-h-[2rem] text-left">{l.obras?.titulo_original}</p>
              </button>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default Home;
