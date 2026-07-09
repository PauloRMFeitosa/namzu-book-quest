import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BotaoSeguir } from "@/components/social/BotaoSeguir";
import { useMeusMatches, useRecalcularMatches } from "@/hooks/useMatches";
import { Search, Users, BookOpen, Sparkles, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── tipos ───────────────────────────────────────────────────────────────────

interface PerfilCard {
  user_id: string;
  nome_exibicao: string;
  username: string;
  avatar_url: string | null;
  slug: string | null;
  bio: string | null;
  interesses?: string[];
  perfil_publico?: boolean;
}

// ─── sub-componente: card de leitor ──────────────────────────────────────────

function LeitorCard({ p }: { p: PerfilCard }) {
  const navigate = useNavigate();
  const initials = (p.nome_exibicao ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
      <button
        onClick={() => navigate(`/perfis/${p.slug ?? p.user_id}`)}
        className="shrink-0"
        aria-label={`Ver perfil de ${p.nome_exibicao}`}
      >
        <Avatar className="w-11 h-11">
          <AvatarImage src={p.avatar_url ?? undefined} alt={p.nome_exibicao} />
          <AvatarFallback className="text-sm font-semibold bg-secondary text-secondary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => navigate(`/perfis/${p.slug ?? p.user_id}`)}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{p.nome_exibicao}</p>
          {p.perfil_publico === false && (
            <Lock className="w-3 h-3 text-muted-foreground shrink-0" aria-label="Perfil privado" />
          )}
        </span>
        <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
        {p.bio && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.bio}</p>
        )}
        {p.interesses && p.interesses.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {p.interesses.slice(0, 3).map((i) => (
              <span
                key={i}
                className="text-[10px] rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground"
              >
                {i}
              </span>
            ))}
          </div>
        )}
      </button>

      <BotaoSeguir seguidoId={p.user_id} size="sm" />
    </div>
  );
}

// ─── aba: descoberta de leitores ──────────────────────────────────────────────

function AbaDescoberta({ busca }: { busca: string }) {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const { data: leitores = [], isLoading } = useQuery({
    queryKey: ["leitores-descoberta", isAdmin],
    enabled: !adminLoading,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      // Admins veem todos os perfis, inclusive privados (marcados com cadeado)
      let query = supabase
        .from("perfis")
        .select(
          "user_id, nome_exibicao, username, avatar_url, slug, bio, perfil_publico"
        )
        .neq("user_id", user?.id ?? "")
        .order("score_reputacao", { ascending: false })
        .limit(100);
      if (!isAdmin) query = query.eq("perfil_publico", true);
      const { data } = await query;
      return (data ?? []) as PerfilCard[];
    },
  });

  const filtrados = useMemo(() => {
    if (!busca) return leitores;
    const q = busca.toLowerCase();
    return leitores.filter(
      (p) =>
        p.nome_exibicao?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q)
    );
  }, [leitores, busca]);

  if (isLoading || adminLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!filtrados.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground/40" />
        <p className="font-semibold text-sm">Nenhum leitor encontrado</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {busca ? `Sem resultados para "${busca}"` : "Seja o primeiro a aparecer aqui!"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filtrados.map((p) => (
        <LeitorCard key={p.user_id} p={p} />
      ))}
    </div>
  );
}

// ─── aba: seguidores do usuário atual ────────────────────────────────────────

function AbaSeguidores({ busca }: { busca: string }) {
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["seguidores", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("v_seguidores")
        .select("seguidor_id, nome_exibicao, username, avatar_url, slug")
        .eq("usuario_id", user!.id);
      return (data ?? []).map((r: any) => ({
        user_id: r.seguidor_id,
        nome_exibicao: r.nome_exibicao,
        username: r.username,
        avatar_url: r.avatar_url,
        slug: r.slug,
        bio: null,
      })) as PerfilCard[];
    },
  });

  const filtrados = useMemo(() => {
    if (!busca) return data;
    const q = busca.toLowerCase();
    return data.filter(
      (p) =>
        p.nome_exibicao?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q)
    );
  }, [data, busca]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!filtrados.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground/40" />
        <p className="font-semibold text-sm">Nenhum seguidor ainda</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Compartilhe seu perfil para que outros leitores possam te seguir.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filtrados.map((p) => (
        <LeitorCard key={p.user_id} p={p} />
      ))}
    </div>
  );
}

// ─── aba: quem o usuário segue ───────────────────────────────────────────────

function AbaSeguindo({ busca }: { busca: string }) {
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["seguindo", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("v_seguindo")
        .select("seguido_id, nome_exibicao, username, avatar_url, slug")
        .eq("usuario_id", user!.id);
      return (data ?? []).map((r: any) => ({
        user_id: r.seguido_id,
        nome_exibicao: r.nome_exibicao,
        username: r.username,
        avatar_url: r.avatar_url,
        slug: r.slug,
        bio: null,
      })) as PerfilCard[];
    },
  });

  const filtrados = useMemo(() => {
    if (!busca) return data;
    const q = busca.toLowerCase();
    return data.filter(
      (p) =>
        p.nome_exibicao?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q)
    );
  }, [data, busca]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!filtrados.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground/40" />
        <p className="font-semibold text-sm">
          {busca ? `Sem resultados para "${busca}"` : "Você ainda não segue ninguém"}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Explore a aba Descobrir para encontrar leitores.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filtrados.map((p) => (
        <LeitorCard key={p.user_id} p={p} />
      ))}
    </div>
  );
}

// ─── aba: compatíveis (match intelectual) ────────────────────────────────────

function AbaCompatíveis({ busca }: { busca: string }) {
  const { data: matches = [], isLoading } = useMeusMatches();
  const recalcular = useRecalcularMatches();
  const navigate = useNavigate();

  const filtrados = useMemo(() => {
    if (!busca) return matches;
    const q = busca.toLowerCase();
    return matches.filter(
      (m) =>
        m.nome_exibicao?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q)
    );
  }, [matches, busca]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Recalculate button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Baseado em interesses, gêneros e obras em comum.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          disabled={recalcular.isPending}
          onClick={() => recalcular.mutate()}
        >
          <RefreshCw className={cn("w-3 h-3", recalcular.isPending && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground/40" />
          <p className="font-semibold text-sm">Nenhum leitor compatível ainda</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {busca
              ? `Sem resultados para "${busca}"`
              : "Clique em Atualizar para calcular seus matches com outros leitores."}
          </p>
          {!busca && (
            <Button
              size="sm"
              disabled={recalcular.isPending}
              onClick={() => recalcular.mutate()}
              className="mt-1 rounded-xl"
            >
              {recalcular.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              Calcular agora
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map((m) => {
            const initials = (m.nome_exibicao ?? "?")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const pct = Math.round(m.compatibilidade);
            const motivos: string[] = Array.isArray(m.motivos) ? m.motivos : [];

            return (
              <div
                key={m.outro_user_id}
                className="p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/perfis/${m.username ?? m.outro_user_id}`)}
                    className="shrink-0"
                  >
                    <Avatar className="w-11 h-11">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback className="text-sm font-semibold bg-secondary text-secondary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>

                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => navigate(`/perfis/${m.username ?? m.outro_user_id}`)}
                  >
                    <p className="text-sm font-semibold truncate">{m.nome_exibicao}</p>
                    <p className="text-xs text-muted-foreground">@{m.username}</p>
                  </button>

                  {/* Compatibility badge */}
                  <div className="flex flex-col items-center shrink-0">
                    <span
                      className={cn(
                        "text-lg font-bold leading-none",
                        pct >= 70 ? "text-primary" : pct >= 50 ? "text-accent-foreground" : "text-muted-foreground"
                      )}
                    >
                      {pct}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">match</span>
                  </div>

                  <BotaoSeguir seguidoId={m.outro_user_id} size="sm" />
                </div>

                {/* Motivos */}
                {motivos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pl-14">
                    {motivos.slice(0, 5).map((mot, i) => (
                      <span
                        key={i}
                        className="text-[10px] rounded-full bg-primary/8 text-primary px-2 py-0.5 font-medium border border-primary/15"
                      >
                        {mot}
                      </span>
                    ))}
                  </div>
                )}

                {/* Books in common */}
                {m.total_lidos > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 pl-14 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {m.total_lidos} livro{m.total_lidos !== 1 ? "s" : ""} lido{m.total_lidos !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── página principal ────────────────────────────────────────────────────────

const TAB_MAP: Record<string, string> = {
  descobrir: "descobrir",
  seguidores: "seguidores",
  seguindo: "seguindo",
  compativeis: "compativeis",
};

export default function Leitores() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = TAB_MAP[searchParams.get("tab") ?? ""] ?? "descobrir";
  const [tab, setTab] = useState(tabParam);
  const [busca, setBusca] = useState("");

  const handleTabChange = (value: string) => {
    setTab(value);
    setSearchParams(value === "descobrir" ? {} : { tab: value });
    setBusca("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold">Leitores</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Descubra, conecte-se e acompanhe outros leitores
        </p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={
            tab === "descobrir"
              ? "Buscar leitores..."
              : tab === "seguidores"
              ? "Buscar nos seus seguidores..."
              : "Buscar em quem você segue..."
          }
          className="pl-9 rounded-2xl bg-secondary border-transparent focus:border-primary"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="descobrir">Descobrir</TabsTrigger>
          <TabsTrigger value="seguidores">Seguidores</TabsTrigger>
          <TabsTrigger value="seguindo">Seguindo</TabsTrigger>
          <TabsTrigger value="compativeis" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Match
          </TabsTrigger>
        </TabsList>

        <TabsContent value="descobrir" className="mt-4">
          <AbaDescoberta busca={busca} />
        </TabsContent>
        <TabsContent value="seguidores" className="mt-4">
          <AbaSeguidores busca={busca} />
        </TabsContent>
        <TabsContent value="seguindo" className="mt-4">
          <AbaSeguindo busca={busca} />
        </TabsContent>
        <TabsContent value="compativeis" className="mt-4">
          <AbaCompatíveis busca={busca} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
