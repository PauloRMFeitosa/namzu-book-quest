import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import LeituraDetalhe from "./LeituraDetalhe";
import { ProgressoBar } from "@/components/leituras/ProgressoBar";

type LivroLista = {
  id: string;
  status: string;
  data_fim: string | null;
  obra_id: string;
  obras: { titulo_original: string; capa_padrao_url: string | null } | null;
  edicoes: { num_paginas: number | null } | null;
};

const useLivrosLendo = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leituras-lendo", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: livros } = await supabase
        .from("usuario_livros")
        .select("id, status, data_fim, obra_id, obras(titulo_original, capa_padrao_url), edicoes(num_paginas)")
        .eq("user_id", user!.id)
        .eq("status", "lendo")
        .order("updated_at", { ascending: false });
      const ids = (livros ?? []).map((l) => l.id);
      let agg: Record<string, number> = {};
      if (ids.length) {
        const { data: leituras } = await supabase
          .from("leituras")
          .select("usuario_livro_id, paginas_lidas")
          .eq("user_id", user!.id)
          .eq("tipo", "leitura")
          .in("usuario_livro_id", ids);
        for (const r of leituras ?? []) {
          if (!r.usuario_livro_id) continue;
          agg[r.usuario_livro_id] = (agg[r.usuario_livro_id] ?? 0) + (r.paginas_lidas ?? 0);
        }
      }
      return (livros ?? []).map((l) => ({ ...l, paginasLidas: agg[l.id] ?? 0 })) as (LivroLista & { paginasLidas: number })[];
    },
  });
};

const useUltimosLidos = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leituras-lidos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("id, status, data_fim, obra_id, obras(titulo_original, capa_padrao_url), edicoes(num_paginas)")
        .eq("user_id", user!.id)
        .in("status", ["lido", "concluido"])
        .order("data_fim", { ascending: false, nullsFirst: false })
        .limit(5);
      return (data ?? []) as LivroLista[];
    },
  });
};

const LeiturasList = () => {
  const navigate = useNavigate();
  const { data: lendo = [] } = useLivrosLendo();
  const { data: lidos = [] } = useUltimosLidos();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Minhas leituras</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">Lendo</h2>
        {lendo.length === 0 ? (
          <div className="card-soft p-6 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Nenhum livro em andamento.</p>
            <Button onClick={() => navigate("/busca")} className="rounded-2xl bg-primary hover:bg-primary-hover">Buscar livros</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lendo.map((l) => {
              const total = l.edicoes?.num_paginas ?? null;
              const percentual = total && total > 0 ? Math.min(100, Math.round((l.paginasLidas / total) * 100)) : 0;
              const restantes = total ? Math.max(0, total - l.paginasLidas) : null;
              return (
                <button key={l.id} onClick={() => navigate(`/leituras/${l.id}`)} className="card-soft p-3 flex gap-3 hover-lift text-left">
                  {l.obras?.capa_padrao_url ? (
                    <img src={l.obras.capa_padrao_url} alt="" className="w-14 h-20 rounded-md object-cover" />
                  ) : (
                    <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col gap-2 justify-center">
                    <p className="font-semibold line-clamp-2">{l.obras?.titulo_original}</p>
                    <ProgressoBar paginasLidas={l.paginasLidas} totalPaginas={total} percentual={percentual} restantes={restantes} compact />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">Últimos lidos</h2>
        {lidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum livro concluído ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {lidos.map((l) => (
              <button key={l.id} onClick={() => navigate(`/leituras/${l.id}`)} className="card-soft p-3 flex gap-3 hover-lift text-left">
                {l.obras?.capa_padrao_url ? (
                  <img src={l.obras.capa_padrao_url} alt="" className="w-14 h-20 rounded-md object-cover" />
                ) : (
                  <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold line-clamp-2">{l.obras?.titulo_original}</p>
                  {l.data_fim && <p className="text-xs text-muted-foreground mt-1">Concluído em {new Date(l.data_fim).toLocaleDateString("pt-BR")}</p>}
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
