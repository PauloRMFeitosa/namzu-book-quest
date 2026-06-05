import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { BookOpen, BookMarked, Plus, ArrowRight, Share2, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LeituraDetalhe from "./LeituraDetalhe";
import { Progress } from "@/components/ui/progress";
import {
  useLendoList,
  useConcluidosRecentes,
  useUltimaSessao,
  useEstatisticasPeriodo,
  LivroResumo,
} from "@/hooks/leituras/useMinhasLeituras";
import { MinhasLeiturasShareModal } from "@/components/leituras/MinhasLeiturasShareModal";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGO = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const Capa = ({ url, titulo, className }: { url?: string | null; titulo?: string; className?: string }) =>
  url ? (
    <img src={url} alt={titulo ?? ""} className={`object-cover shadow-soft ${className ?? ""}`} />
  ) : (
    <div className={`bg-secondary flex items-center justify-center shadow-soft ${className ?? ""}`}>
      <BookOpen className="w-6 h-6 text-primary" />
    </div>
  );

const ContinuarLendo = ({ livro, onClick }: { livro: LivroResumo; onClick: () => void }) => (
  <section className="card-soft p-5 flex flex-col gap-4 bg-gradient-to-br from-primary/5 to-transparent">
    <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Continuar lendo</span>
    <div className="flex gap-4">
      <Capa url={livro.capa_url} titulo={livro.titulo} className="w-20 h-28 rounded-lg" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight line-clamp-2">{livro.titulo}</h2>
        {livro.autor && <p className="text-xs text-muted-foreground italic">{livro.autor}</p>}
        <div className="mt-2">
          <Progress value={livro.percentual} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>
              {livro.total_paginas
                ? `${livro.paginas_lidas} / ${livro.total_paginas} pgs`
                : `${livro.paginas_lidas} pgs`}
            </span>
            <span>{livro.percentual}%</span>
          </div>
        </div>
        {livro.ultima_sessao && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Última sessão: {new Date(livro.ultima_sessao).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
    <Button onClick={onClick} className="rounded-2xl bg-primary hover:bg-primary-hover">
      Continuar leitura <ArrowRight className="w-4 h-4 ml-1" />
    </Button>
  </section>
);

const EmAndamento = ({ livros, onOpen, onAdd }: { livros: LivroResumo[]; onOpen: (id: string) => void; onAdd: () => void }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
      Em andamento {livros.length > 0 && <span className="text-xs">({livros.length})</span>}
    </h2>
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
      {livros.map((l) => (
        <button
          key={l.usuario_leitura_id}
          onClick={() => onOpen(l.usuario_leitura_id)}
          className="card-soft p-3 hover-lift text-left flex-shrink-0 w-40 snap-start flex flex-col gap-2"
        >
          <Capa url={l.capa_url} titulo={l.titulo} className="w-full h-48 rounded-lg" />
          <p className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">{l.titulo}</p>
          <div className="mt-auto">
            <Progress value={l.percentual} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{l.percentual}% concluído</p>
          </div>
        </button>
      ))}
      <button
        onClick={onAdd}
        className="card-soft p-3 hover-lift flex-shrink-0 w-40 snap-start flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-semibold text-primary text-center">Adicionar leitura</p>
      </button>
    </div>
  </section>
);

const ConcluidosRecentes = ({ livros, onOpen, onVerTodos }: { livros: LivroResumo[]; onOpen: (id: string) => void; onVerTodos: () => void }) => {
  if (!livros.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">Concluídos recentemente</h2>
        <button onClick={onVerTodos} className="text-xs text-primary font-medium">Ver todos</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {livros.map((l) => (
          <button
            key={l.usuario_leitura_id}
            onClick={() => onOpen(l.usuario_leitura_id)}
            className="flex-shrink-0 w-28 hover-lift flex flex-col gap-1 text-left"
          >
            <Capa url={l.capa_url} titulo={l.titulo} className="w-28 h-40 rounded-lg" />
            <p className="text-xs font-semibold leading-tight line-clamp-2">{l.titulo}</p>
            {l.data_fim && (
              <p className="text-[10px] text-muted-foreground capitalize">
                {MESES[new Date(l.data_fim).getMonth()]}/{new Date(l.data_fim).getFullYear()}
              </p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};

const Metrica = ({ label, value }: { label: string; value: string | number }) => (
  <div className="card-soft p-3 flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
    <span className="text-xl font-bold text-foreground">{value}</span>
  </div>
);

function formatTempo(min: number | null) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

const EstatisticasBlock = ({ nome }: { nome: string }) => {
  const navigate = useNavigate();
  const now = new Date();
  const [mes, setMes] = useState<number | "all">(now.getMonth() + 1);
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [shareOpen, setShareOpen] = useState(false);
  const { data: stats } = useEstatisticasPeriodo(mes, ano);

  const anos = useMemo(() => {
    const arr: number[] = [];
    for (let a = now.getFullYear(); a >= now.getFullYear() - 4; a--) arr.push(a);
    return arr;
  }, [now]);

  const periodoLabel = mes === "all" ? `Ano ${ano}` : `${MESES_LONGO[(mes as number) - 1]} ${ano}`;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">Estatísticas de leitura</h2>
        <div className="flex gap-2 items-center">
          <Select value={String(mes)} onValueChange={(v) => setMes(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ano inteiro</SelectItem>
              {MESES_LONGO.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="w-full">
          <TabsTrigger value="resumo" className="flex-1">Resumo</TabsTrigger>
          <TabsTrigger value="livros" className="flex-1">Livros</TabsTrigger>
        </TabsList>
        <TabsContent value="resumo" className="mt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Metrica label="Iniciados" value={stats?.livrosIniciados ?? 0} />
            <Metrica label="Concluídos" value={stats?.livrosConcluidos ?? 0} />
            <Metrica label="Páginas lidas" value={stats?.paginasLidas ?? 0} />
            <Metrica label="Sessões" value={stats?.sessoesLeitura ?? 0} />
            <Metrica label="Tempo" value={formatTempo(stats?.tempoMinutos ?? null)} />
          </div>
        </TabsContent>
        <TabsContent value="livros" className="mt-3">
          {(stats?.livros ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum livro no período.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats!.livros.map((l) => (
                <button
                  key={l.usuario_leitura_id}
                  onClick={() => navigate(`/leituras/${l.usuario_leitura_id}`)}
                  className="card-soft p-3 flex gap-3 hover-lift text-left"
                >
                  <Capa url={l.capa_url} titulo={l.titulo} className="w-12 h-16 rounded-md" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="font-semibold text-sm leading-tight line-clamp-2">{l.titulo}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {l.total_paginas
                          ? `${l.paginas_lidas}/${l.total_paginas} pgs · ${l.percentual}%`
                          : `${l.paginas_lidas} pgs`}
                      </span>
                      {l.ultima_sessao && (
                        <span>Última: {new Date(l.ultima_sessao).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Button
        onClick={() => setShareOpen(true)}
        disabled={!stats}
        variant="outline"
        className="rounded-2xl mt-2"
      >
        <Share2 className="w-4 h-4 mr-1" /> Compartilhar Leituras
      </Button>

      {stats && (
        <MinhasLeiturasShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          nome={nome}
          periodoLabel={periodoLabel}
          stats={stats}
        />
      )}
    </section>
  );
};

const LeiturasList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: lendo = [] } = useLendoList();
  const { data: concluidos = [] } = useConcluidosRecentes(8);
  const { data: ultima } = useUltimaSessao();

  const { data: perfil } = useQuery({
    queryKey: ["perfil-nome", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("perfis")
        .select("nome_exibicao")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
  const nome =
    perfil?.nome_exibicao ??
    (user?.user_metadata?.full_name as string) ??
    user?.email?.split("@")[0] ??
    "Leitor";

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <PageHero
        icon={BookMarked}
        badge="Biblioteca"
        title={<>Minhas <span className="text-gradient-warm">leituras</span></>}
        description="Sua biblioteca ativa: retome, acompanhe e celebre."
      />

      {ultima ? (
        <ContinuarLendo livro={ultima} onClick={() => navigate(`/leituras/${ultima.usuario_leitura_id}`)} />
      ) : (
        <section className="card-soft p-6 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-primary mb-3" />
          <p className="font-semibold">Comece sua primeira leitura</p>
          <p className="text-sm text-muted-foreground mt-1 mb-3">Encontre um livro e abra a primeira sessão.</p>
          <Button onClick={() => navigate("/busca")} className="rounded-2xl bg-primary hover:bg-primary-hover">
            <Plus className="w-4 h-4 mr-1" /> Buscar livros
          </Button>
        </section>
      )}

      <EmAndamento
        livros={lendo}
        onOpen={(id) => navigate(`/leituras/${id}`)}
        onAdd={() => navigate("/busca")}
      />

      <ConcluidosRecentes
        livros={concluidos}
        onOpen={(id) => navigate(`/leituras/${id}`)}
        onVerTodos={() => navigate("/livros?status=concluido")}
      />

      <EstatisticasBlock nome={nome.toUpperCase()} />
    </div>
  );
};

const Leituras = () => {
  const { id } = useParams();
  return id ? <LeituraDetalhe /> : <LeiturasList />;
};

export default Leituras;
