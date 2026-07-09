import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { resolverCapa } from "@/lib/capaLivro";
import { useContagemSocial } from "@/hooks/social/useSeguir";
import { EstatisticasLeitura } from "@/components/EstatisticasLeitura";
import { BotaoSeguir } from "@/components/social/BotaoSeguir";
import { MapaAtividades } from "@/components/perfil/MapaAtividades";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  MapPin, CalendarDays, BookOpen, Library, Trophy,
  BarChart3, Users, Award, Lock, ArrowLeft, Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—";

// ─── Prateleira ───────────────────────────────────────────────────────────────
const Prateleira = ({ titulo, itens, aoAbrirLivro }: { titulo: string; itens: any[]; aoAbrirLivro: (usuarioLivroId: string) => void }) => (
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
          const capa = resolverCapa(l.obras?.capa_padrao_url, l.edicoes?.capa_url);
          const titulo = l.edicoes?.titulo_edicao ?? l.obras?.titulo_original ?? "—";
          return (
            <button
              key={l.id}
              onClick={() => aoAbrirLivro(l.id)}
              className="shrink-0 w-20 text-left hover-lift"
              aria-label={`Ver jornada de leitura de ${titulo}`}
            >
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
            </button>
          );
        })}
      </div>
    )}
  </div>
);

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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PerfilPublico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  // Resolve perfil por slug ou user_id
  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ["perfil-publico", id],
    enabled: !!id,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      // Tenta como slug primeiro, depois como UUID
      const { data } = await supabase
        .from("perfis")
        .select("*")
        .or(`slug.eq.${id},user_id.eq.${id}`)
        .maybeSingle();
      return data;
    },
  });

  // Se for o próprio usuário, redireciona para /perfil
  useEffect(() => {
    if (perfil && user && perfil.user_id === user.id) {
      navigate("/perfil", { replace: true });
    }
  }, [perfil, user, navigate]);

  const { data: social } = useContagemSocial(perfil?.user_id);

  const { data: livros = [] } = useQuery({
    queryKey: ["perfil-publico-livros", perfil?.user_id],
    enabled: !!perfil?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuario_livros")
        .select("id,status,favorito,obra_id,edicao_id,obras(titulo_original,capa_padrao_url),edicoes(capa_url,num_paginas,titulo_edicao)")
        .eq("user_id", perfil!.user_id);
      if (error) console.error("[PerfilPublico] livros:", error.message);
      return data ?? [];
    },
  });

  const { data: todasConquistas = [] } = useQuery({
    queryKey: ["todas-conquistas"],
    queryFn: async () => {
      const { data } = await supabase.from("conquistas").select("*").order("xp_recompensa");
      return data ?? [];
    },
  });

  const { data: conquistas = [] } = useQuery({
    queryKey: ["conquistas-publico", perfil?.user_id],
    enabled: !!perfil?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_conquistas")
        .select("conquista_id,desbloqueado_em")
        .eq("user_id", perfil!.user_id);
      return data ?? [];
    },
  });

  // ── Estados derivados ──
  // Perfis privados aguardam a checagem de admin para decidir entre bloquear ou exibir
  if (isLoading || (perfil && !perfil.perfil_publico && adminLoading)) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-44 rounded-2xl bg-muted" />
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (isError || !perfil) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Users className="w-12 h-12 text-muted-foreground/40" />
        <p className="font-semibold">Perfil não encontrado</p>
        <p className="text-sm text-muted-foreground">Este perfil não existe ou foi removido.</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  // Perfil privado e não é o próprio usuário (admins veem tudo)
  if (!perfil.perfil_publico && !isAdmin) {
    const nome = perfil.nome_exibicao ?? "Leitor";
    const initials = nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 w-fit">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="card-soft p-8 flex flex-col items-center gap-4 text-center">
          <Avatar className="w-20 h-20">
            <AvatarImage src={perfil.avatar_url ?? undefined} />
            <AvatarFallback className="text-xl font-semibold bg-secondary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-xl font-semibold">{nome}</p>
            {perfil.username && <p className="text-sm text-muted-foreground">@{perfil.username}</p>}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <p className="text-sm">Este perfil é privado</p>
          </div>
          <BotaoSeguir seguidoId={perfil.user_id} />
        </div>
      </div>
    );
  }

  const nome = perfil.nome_exibicao ?? "Leitor";
  const username = perfil.username ? `@${perfil.username}` : "";
  const initials = nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const concluidos = livros.filter((l: any) => l.status === "concluido" || l.status === "lido");
  const lendo = livros.filter((l: any) => l.status === "lendo");
  const queroLer = livros.filter((l: any) => l.status === "quero_ler");
  const favoritos = livros.filter((l: any) => l.favorito);

  const ownedMap = new Map(conquistas.map((c: any) => [c.conquista_id, c.desbloqueado_em]));

  const abrirLivro = (usuarioLivroId: string) =>
    navigate(`/perfis/${id}/livros/${usuarioLivroId}`);

  return (
    <div className="flex flex-col gap-6">
      {/* Voltar */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 w-fit">
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>

      {/* HEADER */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[var(--radius)] border border-border/60 bg-card"
      >
        {/* Mapa anual de atividades de leitura (substitui o banner) */}
        <div className="px-4 pt-4 md:px-5 md:pt-5">
          <MapaAtividades userId={perfil.user_id} />
        </div>

        <div className="px-5 pb-5 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 pt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-semibold leading-tight">{nome}</h1>
                {perfil.verificado && <Badge variant="secondary">Verificado</Badge>}
                {!perfil.perfil_publico && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Lock className="w-3 h-3" /> Privado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{username}</p>
              {perfil.bio && (
                <p className="text-sm text-foreground/80 mt-2 max-w-xl">{perfil.bio}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                {(perfil.cidade || perfil.pais) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[perfil.cidade, perfil.pais].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Entrou em {formatDate(perfil.created_at)}
                </span>
              </div>
            </div>
            {/* Foto à direita, sobrepondo parcialmente a base do mapa */}
            <div className="flex flex-col items-center gap-2 shrink-0 -mt-8 md:-mt-10 relative z-10">
              <Avatar className="w-24 h-24 md:w-28 md:h-28 border-4 border-card shadow-md">
                <AvatarImage src={perfil.avatar_url ?? undefined} alt={nome} />
                <AvatarFallback className="text-xl font-semibold bg-secondary text-secondary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <BotaoSeguir seguidoId={perfil.user_id} />
            </div>
          </div>

          {/* Contadores sociais */}
          <div className="mt-4 flex gap-6 text-xs border-t border-border/60 pt-3">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold tabular-nums">{social?.seguidores ?? "—"}</span>
              <span className="text-muted-foreground">seguidores</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold tabular-nums">{social?.seguindo ?? "—"}</span>
              <span className="text-muted-foreground">seguindo</span>
            </span>
          </div>
        </div>
      </motion.section>

      {/* TABS */}
      <Tabs defaultValue="biblioteca" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="biblioteca" className="gap-1.5">
            <Library className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Biblioteca</span>
          </TabsTrigger>
          <TabsTrigger value="conquistas" className="gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Conquistas</span>
          </TabsTrigger>
          {perfil.mostrar_estatisticas !== false && (
            <TabsTrigger value="estatisticas" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* BIBLIOTECA */}
        <TabsContent value="biblioteca" className="flex flex-col gap-5 mt-4">
          <Prateleira titulo="Lendo" itens={lendo} aoAbrirLivro={abrirLivro} />
          <Prateleira titulo="Concluídos" itens={concluidos} aoAbrirLivro={abrirLivro} />
          <Prateleira titulo="Quero Ler" itens={queroLer} aoAbrirLivro={abrirLivro} />
          <Prateleira titulo="Favoritos" itens={favoritos} aoAbrirLivro={abrirLivro} />
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
          {conquistas.length === 0 && (
            <div className="card-soft p-8 text-center flex flex-col items-center gap-2">
              <Trophy className="w-8 h-8 text-muted-foreground" />
              <p className="font-semibold">Nenhuma conquista ainda</p>
            </div>
          )}
        </TabsContent>

        {/* ESTATÍSTICAS */}
        {perfil.mostrar_estatisticas !== false && (
          <TabsContent value="estatisticas" className="mt-4">
            <EstatisticasLeitura userId={perfil.user_id} mostrar={true} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
