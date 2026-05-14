import { Link } from "react-router-dom";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecomendacoesIA } from "@/hooks/clubes/useClubeAI";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export const RecomendacoesIA = () => {
  const reco = useRecomendacoesIA();
  const ids = reco.data?.recomendacoes.map((r) => r.clube_id) ?? [];

  const { data: clubes } = useQuery({
    queryKey: ["clubes-reco-ia", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("clubes")
        .select("id, nome, imagem_capa_url")
        .in("id", ids);
      return data ?? [];
    },
  });

  return (
    <section className="rounded-[var(--radius)] border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="font-display text-base font-semibold">Curadoria IA pra você</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => reco.mutate()}
          disabled={reco.isPending}
          className="text-xs h-8 gap-1.5"
        >
          {reco.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : reco.data ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {reco.data ? "Recalcular" : "Gerar"}
        </Button>
      </div>

      {!reco.data && !reco.isPending && (
        <p className="text-xs text-muted-foreground">
          Deixe a IA escolher clubes alinhados ao seu perfil intelectual.
        </p>
      )}

      {reco.isPending && (
        <p className="text-xs text-muted-foreground">Lendo seu perfil…</p>
      )}

      {reco.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {reco.data.recomendacoes.map((r, i) => {
            const c = clubes?.find((x) => x.id === r.clube_id);
            if (!c) return null;
            return (
              <motion.div
                key={r.clube_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/clubes/${c.id}`}
                  className="flex gap-3 p-3 rounded-xl bg-card hover:bg-card/70 border border-border/50 transition"
                >
                  {c.imagem_capa_url ? (
                    <img src={c.imagem_capa_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">
                      {r.motivo}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
};
