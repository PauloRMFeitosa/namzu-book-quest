import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { BookOpen, BookMarked } from "lucide-react";
import LeituraDetalhe from "./LeituraDetalhe";
import { ProgressoBar } from "@/components/leituras/ProgressoBar";

const useExperiencias = (status: "lendo" | "concluido") => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["experiencias", status, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("usuario_leituras")
        .select("id, status, data_fim, usuario_livro_id, usuario_livros!inner(id, user_id, obra_id, obras(titulo_original, capa_padrao_url), edicoes(num_paginas))")
        .eq("usuario_livros.user_id", user!.id)
        .eq("status", status);

      if (status === "lendo") q = q.order("updated_at", { ascending: false });
      else q = q.order("data_fim", { ascending: false });

      const { data: experiencias } = await q;
      const expIds = (experiencias ?? []).map((e: any) => e.id);

      // agregação de páginas via leitura_progresso
      const agg: Record<string, number> = {};
      if (expIds.length) {
        const { data: leituras } = await supabase
          .from("leituras")
          .select("id, usuario_leitura_id")
          .in("usuario_leitura_id", expIds)
          .eq("tipo", "leitura");
        const leituraIds = (leituras ?? []).map((l: any) => l.id);
        const idToExp: Record<string, string> = {};
        (leituras ?? []).forEach((l: any) => (idToExp[l.id] = l.usuario_leitura_id));
        if (leituraIds.length) {
          const { data: prog } = await supabase
            .from("leitura_progresso")
            .select("leitura_id, paginas_lidas")
            .in("leitura_id", leituraIds);
          for (const p of prog ?? []) {
            const exp = idToExp[p.leitura_id ?? ""];
            if (!exp) continue;
            agg[exp] = (agg[exp] ?? 0) + (p.paginas_lidas ?? 0);
          }
        }
      }

      // Agrupa por usuario_livro_id: mantém a experiência mais recente como
      // representante (para navegação) e soma páginas de todas as experiências do livro.
      const grouped: Record<string, any> = {};
      for (const e of experiencias ?? []) {
        const key = (e as any).usuario_livro_id;
        const pages = agg[(e as any).id] ?? 0;
        if (!grouped[key]) {
          grouped[key] = { ...e, paginasLidas: pages, experienciasCount: 1 };
        } else {
          grouped[key].paginasLidas += pages;
          grouped[key].experienciasCount += 1;
        }
      }
      return Object.values(grouped);
    },
  });
};

const StageBadge = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
    {label}
  </span>
);

const LeiturasList = () => {
  const navigate = useNavigate();
  const { data: lendo = [] } = useExperiencias("lendo");
  const { data: lidos = [] } = useExperiencias("concluido");

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <PageHero
        icon={BookMarked}
        badge="Jornada"
        title={<>Minhas <span className="text-gradient-warm">leituras</span></>}
        description="Acompanhe o progresso das suas experiências de leitura."
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">Em andamento</h2>
          {lendo.length > 0 && (
            <span className="text-xs text-muted-foreground">{lendo.length}</span>
          )}
        </div>
        {lendo.length === 0 ? (
          <div className="card-soft p-6 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Nenhum livro em andamento.</p>
            <Button onClick={() => navigate("/busca")} className="rounded-2xl bg-primary hover:bg-primary-hover">Buscar livros</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lendo.map((l: any) => {
              const total = l.usuario_livros?.edicoes?.num_paginas ?? null;
              const percentual = total && total > 0 ? Math.min(100, Math.round((l.paginasLidas / total) * 100)) : 0;
              const restantes = total ? Math.max(0, total - l.paginasLidas) : null;
              return (
                <button
                  key={l.id}
                  onClick={() => navigate(`/leituras/${l.id}`)}
                  className="card-soft p-4 flex gap-4 hover-lift text-left group"
                >
                  {l.usuario_livros?.obras?.capa_padrao_url ? (
                    <img src={l.usuario_livros.obras.capa_padrao_url} alt="" className="w-16 h-24 rounded-lg object-cover shadow-soft" />
                  ) : (
                    <div className="w-16 h-24 rounded-lg bg-secondary flex items-center justify-center"><BookOpen className="w-6 h-6 text-primary" /></div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col gap-2 justify-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StageBadge label="Lendo" />
                      {l.experienciasCount > 1 && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{l.experienciasCount} sessões</span>
                      )}
                    </div>
                    <p className="font-semibold leading-tight line-clamp-2">{l.usuario_livros?.obras?.titulo_original}</p>
                    <ProgressoBar paginasLidas={l.paginasLidas} totalPaginas={total} percentual={percentual} restantes={restantes} compact />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">Concluídos</h2>
          {lidos.length > 0 && <span className="text-xs text-muted-foreground">{lidos.length}</span>}
        </div>
        {lidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum livro concluído ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {lidos.slice(0, 5).map((l: any) => (
              <button
                key={l.id}
                onClick={() => navigate(`/leituras/${l.id}`)}
                className="card-soft p-4 flex gap-4 hover-lift text-left"
              >
                {l.usuario_livros?.obras?.capa_padrao_url ? (
                  <img src={l.usuario_livros.obras.capa_padrao_url} alt="" className="w-16 h-24 rounded-lg object-cover shadow-soft" />
                ) : (
                  <div className="w-16 h-24 rounded-lg bg-secondary flex items-center justify-center"><BookOpen className="w-6 h-6 text-primary" /></div>
                )}
                <div className="flex-1 min-w-0 flex flex-col gap-2 justify-center">
                  <StageBadge label="Concluído" />
                  <p className="font-semibold leading-tight line-clamp-2">{l.usuario_livros?.obras?.titulo_original}</p>
                  {l.data_fim && <p className="text-xs text-muted-foreground">Finalizado em {new Date(l.data_fim).toLocaleDateString("pt-BR")}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Leituras = () => {
  const { id } = useParams();
  return id ? <LeituraDetalhe /> : <LeiturasList />;
};

export default Leituras;
