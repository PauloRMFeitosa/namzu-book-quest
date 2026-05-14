import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { useClubes } from "@/hooks/clubes/useClubes";
import { FiltrosBar } from "@/components/clubes/marketplace/FiltrosBar";
import { SecaoCarrossel } from "@/components/clubes/marketplace/SecaoCarrossel";
import { ClubeCard } from "@/components/clubes/marketplace/ClubeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { RecomendacoesIA } from "@/components/clubes/ai/RecomendacoesIA";

const Marketplace = () => {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  const { data: clubes = [], isLoading } = useClubes({ busca, categoria });

  const secoes = useMemo(() => {
    if (!clubes.length) return null;
    const sortBy = <K extends keyof typeof clubes[number]>(k: K, asc = false) =>
      [...clubes].sort((a, b) => {
        const av = Number(a[k] ?? 0);
        const bv = Number(b[k] ?? 0);
        return asc ? av - bv : bv - av;
      });

    return {
      em_alta: sortBy("engagement_score").slice(0, 8),
      novos: [...clubes]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 8),
      profundos: sortBy("profundidade_score").slice(0, 8),
      ativos: sortBy("ativos_7d").slice(0, 8),
      pequenos: clubes
        .filter((c) => c.membros_count > 0 && c.membros_count <= 30)
        .slice(0, 8),
    };
  }, [clubes]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-8">
        {/* Hero editorial */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[var(--radius)] border border-border/60 bg-gradient-paper px-5 py-7"
        >
          <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-accent uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clubes de leitura</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight text-foreground">
              Encontre sua <span className="text-gradient-warm">tribo intelectual</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Comunidades vivas para mergulhar fundo em livros, ideias e conversas que importam.
            </p>
          </div>
        </motion.header>

        <FiltrosBar
          busca={busca}
          onBusca={setBusca}
          categoria={categoria}
          onCategoria={setCategoria}
        />

        <RecomendacoesIA />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/12] rounded-[var(--radius)]" />
            ))}
          </div>
        ) : !clubes.length ? (
          <EmptyState busca={busca} categoria={categoria} />
        ) : (busca || categoria) ? (
          <ResultadosFiltrados clubes={clubes} />
        ) : secoes ? (
          <div className="flex flex-col gap-10">
            <SecaoCarrossel
              titulo="Em alta"
              legenda="O que está movimentando a comunidade agora"
              clubes={secoes.em_alta}
            />
            <SecaoCarrossel
              titulo="Para você"
              legenda="Selecionados com base no seu perfil"
              clubes={secoes.em_alta}
            />
            <SecaoCarrossel
              titulo="Mais profundos"
              legenda="Discussões densas e leitura atenta"
              clubes={secoes.profundos}
            />
            <SecaoCarrossel
              titulo="Mais ativos"
              legenda="Membros que aparecem todo dia"
              clubes={secoes.ativos}
            />
            <SecaoCarrossel
              titulo="Pequenos clubes"
              legenda="Tribos íntimas, até 30 membros"
              clubes={secoes.pequenos}
              emptyText="Nenhum clube pequeno disponível agora."
            />
            <SecaoCarrossel
              titulo="Recém-chegados"
              legenda="Acabaram de abrir as portas"
              clubes={secoes.novos}
            />
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

const ResultadosFiltrados = ({ clubes }: { clubes: ReturnType<typeof useClubes>["data"] }) => {
  const list = clubes ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {list.length} {list.length === 1 ? "resultado" : "resultados"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map((c) => (
          <ClubeCard key={c.id} clube={c} />
        ))}
      </div>
    </section>
  );
};

const EmptyState = ({ busca, categoria }: { busca: string; categoria: string | null }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed border-border/60 rounded-2xl bg-card/40">
    <div className="text-4xl">📚</div>
    <h3 className="font-display text-lg font-semibold">Nenhum clube encontrado</h3>
    <p className="text-sm text-muted-foreground max-w-sm">
      {busca || categoria
        ? "Tente outros filtros ou termos de busca."
        : "Ainda não há clubes ativos. Volte em breve."}
    </p>
  </div>
);

export default Marketplace;
