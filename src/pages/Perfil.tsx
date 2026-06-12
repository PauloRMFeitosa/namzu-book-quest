import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGamificacao } from "@/hooks/useGamificacao";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Award, BookOpen, Flame, Info, MapPin, CalendarDays, Sparkles,
  Library, Lightbulb, Trophy, BarChart3, Star, Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useInteressesUsuario } from "@/hooks/useInteressesUsuario";
import { Button } from "@/components/ui/button";
import { useContagemSocial } from "@/hooks/social/useSeguir";
import { EstatisticasLeitura } from "@/components/EstatisticasLeitura";
import { useStatsLeitura } from "@/hooks/useEstatisticas";

const CATEGORIAS = [
  { key: "leitura", label: "Leitura", emoji: "📚" },
  { key: "consistencia", label: "Consistência", emoji: "🔥" },
  { key: "conhecimento", label: "Conhecimento", emoji: "✍️" },
  { key: "comunidade", label: "Comunidade", emoji: "👥" },
];

function categoriaDe(c: any): string {
  if (c.categoria) return c.categoria;
  const codigo: string = c.codigo ?? "";
  if (codigo.startsWith("leitura") || codigo === "primeiro_livro") return "leitura";
  if (codigo.startsWith("consistencia")) return "consistencia";
  if (codigo.startsWith("conhecimento")) return "conhecimento";
  if (codigo.startsWith("comunidade")) return "comunidade";
  return "leitura";
}

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—";

const Perfil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: gam } = useGamificacao();
  const { data: meusInteresses = [] } = useInteressesUsuario();

  const { data: perfil } = useQuery({
    queryKey: ["perfil", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("perfis").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: social } = useContagemSocial(user?.id);
  const { data: statsLeitura } = useStatsLeitura(user?.id);

  const { data: livros = [] } = useQuery({
    queryKey: ["perfil-livros", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("id,status,favorito,obra_id,edicao_id,obras(titulo_original,capa_padrao_url),edicoes(capa_url,num_paginas,titulo_edicao)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: insights = [] } = useQuery({
    queryKey: ["perfil-insights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("leituras")
        .select(`
          id,
          leitura_conteudo(id, resumo, conceito_principal),
          leitura_aplicacoes(id, descricao, plano_acao),
          leitura_citacoes(id, texto, pagina),
          leitura_pos(resenha),
          usuario_leituras(usuario_livros(obras(titulo_original)))
        `)
        .eq("user_id", user!.id);
      // Só mostrar leituras com algum conteúdo de aprendizado
      return (data ?? []).filter((l: any) =>
        l.leitura_conteudo?.length > 0 ||
        l.leitura_aplicacoes?.length > 0 ||
        l.leitura_citacoes?.length > 0 ||
        l.leitura_pos?.resenha
      );
    },
  });

  const { data: todasConquistas = [] } = useQuery({
    queryKey: ["todas-conquistas"],
    queryFn: async () => {
      const { data } = await supabase.from("conquistas").select("*").order("xp_recompensa");
      return data ?? [];
    },
  });

  const { data: minhasConquistas = [] } = useQuery({
    queryKey: ["minhas-conquistas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_conquistas")
        .select("conquista_id,desbloqueado_em")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: missoesConcluidas = 0 } = useQuery({
    queryKey: ["missoes-concluidas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("usuario_missoes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("concluida", true);
      return count ?? 0;
    },
  });

  const ownedMap = new Map(minhasConquistas.map((c: any) => [c.conquista_id, c.desbloqueado_em]));
  const concluidos = livros.filter((l: any) => l.status === "concluido" || l.status === "lido");
  const lendo = livros.filter((l: any) => l.status === "lendo");
  const queroLer = livros.filter((l: any) => l.status === "quero_ler");
  const favoritos = livros.filter((l: any) => l.favorito);

  // paginas_estimadas vem do RPC (usa COALESCE(num_paginas, 300) por livro concluído)
  // Mais confiável que somar edicoes.num_paginas que frequentemente é null
  const paginasEstimadas = statsLeitura?.paginas_estimadas ?? 0;

  const xpAtual = gam?.xp_total ?? 0;
  const xpNivel = gam?.xp_proximo_nivel ?? 100;
  const progresso = Math.min(100, Math.round((xpAtual / xpNivel) * 100));

  const nome = perfil?.nome_exibicao ?? user?.user_metadata?.full_name ?? user?.email ?? "Leitor";
  const username = perfil?.username ? `@${perfil.username}` : "@leitor";
  const initials = nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* SEÇÃO 1 - HEADER */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[var(--radius)] border border-border/60 bg-card"
      >
        <div
          className="h-32 md:h-44 w-full bg-gradient-paper relative"
          style={
            perfil?.banner_url
              ? { backgroundImage: `url(${perfil.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
        </div>
        <div className="px-5 pb-5 -mt-12 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <Avatar className="w-24 h-24 border-4 border-card shadow-md">
              <AvatarImage src={perfil?.avatar_url ?? undefined} alt={nome} />
              <AvatarFallback className="text-xl font-semibold bg-secondary text-secondary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
                  {nome}
                </h1>
                {perfil?.verificado && <Badge variant="secondary">Verificado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{username}</p>
              {perfil?.bio && (
                <p className="text-sm text-foreground/80 mt-2 max-w-xl">{perfil.bio}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                {(perfil?.cidade || perfil?.pais) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[perfil?.cidade, perfil?.pais].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Entrou em {formatDate(perfil?.created_at ?? user?.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Contadores sociais */}
          <div className="mt-4 flex gap-6 text-xs border-t border-border/60 pt-3">
            <button
              onClick={() => navigate("/leitores?tab=seguidores")}
              className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold tabular-nums">{social?.seguidores ?? "—"}</span>
              <span className="text-muted-foreground">seguidores</span>
            </button>
            <button
              onClick={() => navigate("/leitores?tab=seguindo")}
              className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold tabular-nums">{social?.seguindo ?? "—"}</span>
              <span className="text-muted-foreground">seguindo</span>
            </button>
          </div>
        </div>
      </motion.section>

      {/* SEÇÃO 2 - STATS RÁPIDAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat icon={BookOpen} label="Livros" value={concluidos.length} color="text-primary" />
        <QuickStat icon={Library} label="Páginas est." value={paginasEstimadas >= 1000 ? `${(paginasEstimadas / 1000).toFixed(1)}k` : paginasEstimadas.toLocaleString("pt-BR")} color="text-accent" />
        <QuickStat icon={Star} label="XP Total" value={xpAtual.toLocaleString("pt-BR")} color="text-yellow-500" />
        <QuickStat icon={Award} label="Conquistas" value={minhasConquistas.length} color="text-orange-500" />
      </div>

      {/* SEÇÃO 3 - NÍVEL */}
      <div className="card-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold">Nível {gam?.nivel ?? 1}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {xpAtual.toLocaleString("pt-BR")} / {xpNivel.toLocaleString("pt-BR")} XP
          </span>
        </div>
        <Progress value={progresso} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">
          {xpNivel - xpAtual > 0 ? `Faltam ${(xpNivel - xpAtual).toLocaleString("pt-BR")} XP para o próximo nível` : "Pronto para subir de nível!"}
        </p>
      </div>

      {/* SEÇÃO 4 - CÓDIGO ME */}
      <section className="card-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">
              Código <span className="text-gradient-warm">ME</span> do Leitor
            </h3>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition"
                  aria-label="Sobre o Código ME"
                >
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm leading-relaxed">
                <p className="mb-2">
                  Tudo no universo, segundo os sumérios, possuía um <strong>Me</strong> — um conjunto de princípios que definia sua essência.
                </p>
                <p>
                  No Namzu, o <strong>Código ME</strong> representa os blocos construtores do seu conhecimento como leitor. Ele será formado pelos temas que você lê, pelos livros que conclui, pelos aprendizados que registra e pelos interesses que desenvolve ao longo da sua jornada.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {meusInteresses.length > 0 ? "início" : "não iniciado"}
          </Badge>
        </div>

        {meusInteresses.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Seu Código ME ainda não foi iniciado.
            </p>
            <Button
              onClick={() => navigate("/onboarding-interesses")}
              className="h-11 rounded-2xl bg-primary hover:bg-primary-hover"
            >
              Iniciar Código ME
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {meusInteresses.map((m) => (
                <span
                  key={m.interesse_id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium"
                >
                  {m.icone && <span className="text-base leading-none">{m.icone}</span>}
                  {m.nome}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Seus interesses irão refinar automaticamente seu Código ME conforme suas leituras, aprendizados e atividades evoluírem.
            </p>
          </>
        )}
      </section>

      {/* SEÇÃO 5 - TABS */}
      <Tabs defaultValue="biblioteca" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="biblioteca" className="gap-1.5">
            <Library className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Biblioteca</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="conquistas" className="gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Conquistas</span>
          </TabsTrigger>
          <TabsTrigger value="estatisticas" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
        </TabsList>

        {/* BIBLIOTECA */}
        <TabsContent value="biblioteca" className="flex flex-col gap-5 mt-4">
          <Prateleira titulo="Quero Ler" itens={queroLer} />
          <Prateleira titulo="Lendo" itens={lendo} />
          <Prateleira titulo="Concluídos" itens={concluidos} />
          <Prateleira titulo="Favoritos" itens={favoritos} />
        </TabsContent>

        {/* INSIGHTS */}
        <TabsContent value="insights" className="flex flex-col gap-3 mt-4">
          {insights.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="Nenhum aprendizado ainda"
              desc="Registre insights, aplicações e citações nas suas leituras e veja-os aqui."
            />
          ) : (
            insights.map((l: any) => {
              const titulo = l.usuario_leituras?.usuario_livros?.obras?.titulo_original ?? "Leitura";
              const conteudos: any[] = l.leitura_conteudo ?? [];
              const aplicacoes: any[] = l.leitura_aplicacoes ?? [];
              const citacoes: any[] = l.leitura_citacoes ?? [];
              const resenha: string | null = l.leitura_pos?.resenha ?? null;
              return (
                <div key={l.id} className="card-soft p-4 flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                    {titulo}
                  </p>

                  {/* Insights / Conteúdo */}
                  {conteudos.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] uppercase text-muted-foreground flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Insights ({conteudos.length})
                      </p>
                      {conteudos.map((c: any) => (
                        <div key={c.id} className="p-2 rounded-lg bg-muted/30">
                          {c.resumo && <p className="text-sm">{c.resumo}</p>}
                          {c.conceito_principal && (
                            <p className="text-xs text-muted-foreground mt-0.5">{c.conceito_principal}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Aplicações */}
                  {aplicacoes.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Aplicações ({aplicacoes.length})
                      </p>
                      {aplicacoes.map((a: any) => (
                        <div key={a.id} className="p-2 rounded-lg bg-muted/30">
                          <p className="text-sm">{a.descricao}</p>
                          {a.plano_acao?.categoria && (
                            <span className="inline-block text-[10px] uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-full mt-1">
                              {a.plano_acao.categoria}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Citações */}
                  {citacoes.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Citações ({citacoes.length})
                      </p>
                      {citacoes.map((c: any) => (
                        <p key={c.id} className="text-sm border-l-2 border-primary pl-2 italic">
                          "{c.texto}"
                          {c.pagina && (
                            <span className="text-xs not-italic text-muted-foreground"> · pg {c.pagina}</span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Resenha */}
                  {resenha && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] uppercase text-muted-foreground">Resenha</p>
                      <p className="text-sm whitespace-pre-line p-2 rounded-lg bg-muted/30">{resenha}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* CONQUISTAS */}
        <TabsContent value="conquistas" className="flex flex-col gap-5 mt-4">
          {CATEGORIAS.map((cat) => {
            const lista = todasConquistas.filter((c: any) => categoriaDe(c) === cat.key);
            if (!lista.length) return null;
            const obtidas = lista.filter((c: any) => ownedMap.has(c.id)).length;
            return (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                    {cat.emoji} {cat.label}
                  </p>
                  <span className="text-xs text-muted-foreground">{obtidas} / {lista.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {lista.map((c: any) => {
                    const data = ownedMap.get(c.id);
                    const obtida = !!data;
                    return (
                      <div
                        key={c.id}
                        className={`card-soft p-3 transition ${obtida ? "" : "opacity-50 grayscale"}`}
                      >
                        <Award className={`w-6 h-6 mb-1.5 ${obtida ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-sm font-semibold leading-tight">{c.nome}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{c.descricao}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {obtida ? formatDate(data as string) : `+${c.xp_recompensa} XP`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ESTATÍSTICAS */}
        <TabsContent value="estatisticas" className="mt-4">
          <EstatisticasLeitura
            userId={user?.id}
            mostrar={perfil?.mostrar_estatisticas !== false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const QuickStat = ({ icon: Icon, label, value, color }: any) => (
  <div className="card-soft p-4 flex flex-col gap-1">
    <Icon className={`w-5 h-5 ${color}`} />
    <p className="text-xl font-bold tabular-nums">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const StatItem = ({ icon: Icon, label, value }: any) => (
  <div className="card-soft p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

const Prateleira = ({ titulo, itens }: { titulo: string; itens: any[] }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-semibold">{titulo}</h4>
      <span className="text-xs text-muted-foreground">{itens.length}</span>
    </div>
    {itens.length === 0 ? (
      <p className="text-xs text-muted-foreground italic">Nenhum livro nesta prateleira.</p>
    ) : (
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {itens.slice(0, 20).map((l: any) => {
          const capa = l.edicoes?.capa_url ?? l.obras?.capa_padrao_url;
          const titulo = l.edicoes?.titulo_edicao ?? l.obras?.titulo_original ?? "—";
          return (
            <div key={l.id} className="shrink-0 w-20">
              <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted border border-border/60">
                {capa ? (
                  <img src={capa} alt={titulo} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-[10px] mt-1 line-clamp-2 leading-tight">{titulo}</p>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const EmptyState = ({ icon: Icon, title, desc }: any) => (
  <div className="card-soft p-8 text-center flex flex-col items-center gap-2">
    <Icon className="w-8 h-8 text-muted-foreground" />
    <p className="font-semibold">{title}</p>
    <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
  </div>
);

export default Perfil;
