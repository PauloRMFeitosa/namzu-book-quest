import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GamificacaoHome } from "@/components/gamificacao/GamificacaoHome";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { IniciarCodigoMeCard } from "@/components/IniciarCodigoMeCard";

import { BookOpen, Plus, ArrowRight, HomeIcon, Users } from "lucide-react";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const firstName = (user?.user_metadata?.full_name as string)?.split(" ")[0] || user?.email?.split("@")[0] || "leitor";

  const { data: lendoList = [] } = useQuery({
    queryKey: ["leituras-lendo", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: uls } = await supabase
        .from("usuario_livros")
        .select("id")
        .eq("user_id", user!.id);
      const ulIds = (uls ?? []).map((u: any) => u.id);
      if (!ulIds.length) return [];
      const { data } = await supabase
        .from("usuario_leituras")
        .select("id, usuario_livros!inner(obra_id, obras(*))")
        .in("usuario_livro_id", ulIds)
        .eq("status", "lendo")
        .order("updated_at", { ascending: false });
      return (data ?? []).map((d: any) => ({
        id: d.id,
        obras: d.usuario_livros?.obras,
      }));
    },
  });

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

  const { data: clubes = [] } = useQuery({
    queryKey: ["meus-clubes-ativos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("clube_membros")
        .select("clubes(*)")
        .eq("user_id", user!.id)
        .eq("status", "ativo");
      return (data ?? [])
        .map((r: any) => r.clubes)
        .filter((c: any) => c && c.is_ativo);
    },
  });

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

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">Meus clubes ativos</p>
          </div>
          <button onClick={() => navigate("/clubes")} className="text-sm text-primary font-medium">Ver todos</button>
        </div>
        {clubes.length === 0 ? (
          <div className="card-soft p-6 text-center">
            <Users className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="font-semibold">Você ainda não participa de nenhum clube ativo</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Encontre uma comunidade que combina com você.</p>
            <Button onClick={() => navigate("/clubes")} className="h-[48px] rounded-2xl bg-primary hover:bg-primary-hover">
              Explorar clubes
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clubes.map((c: any) => (
              <button key={c.id} onClick={() => navigate(`/clubes/${c.id}`)} className="card-soft p-4 flex items-center gap-3 hover-lift text-left">
                {c.imagem_capa_url ? (
                  <img src={c.imagem_capa_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-primary font-bold text-lg">{c.nome[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{c.descricao}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      {lendoList.length > 0 ? (
        <section>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            Lendo agora {lendoList.length > 1 && `(${lendoList.length})`}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {lendoList.map((l: any) => (
              <button
                key={l.id}
                onClick={() => navigate(`/leituras/${l.id}`)}
                className="card-soft p-4 hover-lift text-left flex-shrink-0 w-[85%] snap-start"
              >
                <div className="flex gap-4">
                  {l.obras?.capa_padrao_url ? (
                    <img src={l.obras.capa_padrao_url} alt="" className="w-20 h-28 rounded-lg object-cover shadow-soft" />
                  ) : (
                    <div className="w-20 h-28 rounded-lg bg-secondary flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col min-w-0">
                    <h2 className="font-semibold text-lg leading-tight line-clamp-2">{l.obras?.titulo_original}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{l.obras?.ano_primeira_publicacao}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm text-primary font-medium">
                      Continuar lendo <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="card-soft p-6 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-primary mb-3" />
          <h2 className="font-semibold text-lg">Comece sua primeira leitura</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Encontre um livro e adicione à sua estante.</p>
          <Button onClick={() => navigate("/busca")} className="h-[52px] rounded-2xl bg-primary hover:bg-primary-hover">
            <Plus className="w-4 h-4" /> Buscar livros
          </Button>
        </section>
      )}


      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Últimos livros adicionados</h3>
          <button onClick={() => navigate("/livros")} className="text-sm text-primary font-medium">Ver todos</button>
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
