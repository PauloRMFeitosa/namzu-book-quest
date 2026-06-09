import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { Bell, BellRing, Star, UserPlus, Heart, CalendarDays, CheckCheck } from "lucide-react";
import { PendenciasAvaliacaoCard } from "@/components/avaliacoes/PendenciasAvaliacaoCard";
import { usePendenciasCount } from "@/hooks/useAvaliacoesPendentes";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// ─── mapa de tipos → ícone + cor de destaque ───────────────────────────────
const TIPO_CONFIG: Record<
  string,
  { icon: React.ElementType; cor: string; label: string }
> = {
  avaliacao_pendente: {
    icon: Star,
    cor: "text-amber-500",
    label: "Avaliação",
  },
  clube_novo_membro: {
    icon: UserPlus,
    cor: "text-blue-500",
    label: "Novo membro",
  },
  clube_curtida_post: {
    icon: Heart,
    cor: "text-rose-500",
    label: "Curtida",
  },
  clube_novo_evento: {
    icon: CalendarDays,
    cor: "text-violet-500",
    label: "Evento",
  },
};

const TIPO_DEFAULT = { icon: Bell, cor: "text-primary", label: "Aviso" };

// ─── Card individual ────────────────────────────────────────────────────────
const NotificacaoCard = ({
  n,
  onLida,
}: {
  n: any;
  onLida: (id: string) => void;
}) => {
  const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_DEFAULT;
  const Icon = cfg.icon;

  const inner = (
    <div
      className={`card-soft p-4 flex gap-3 transition-opacity ${n.lida ? "opacity-60" : ""}`}
    >
      {/* Ícone de tipo */}
      <div
        className={`shrink-0 w-9 h-9 rounded-xl bg-muted flex items-center justify-center ${cfg.cor}`}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.cor}`}
            >
              {cfg.label}
            </span>
            <p className="font-semibold text-sm leading-snug mt-0.5">
              {n.titulo}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {n.mensagem}
            </p>
          </div>
          {/* Indicador não lida */}
          {!n.lida && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {new Date(n.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );

  // Se tem link e ainda não lida, marca como lida ao clicar
  if (n.link_url && !n.lida) {
    return (
      <Link to={n.link_url} onClick={() => onLida(n.id)}>
        {inner}
      </Link>
    );
  }
  if (n.link_url) {
    return <Link to={n.link_url}>{inner}</Link>;
  }
  return <div>{inner}</div>;
};

// ─── Página ─────────────────────────────────────────────────────────────────
const Notificacoes = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: pendencias = 0 } = usePendenciasCount();

  const { data = [] } = useQuery({
    queryKey: ["notificacoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const naoLidas = data.filter((n: any) => !n.lida);
  const semNada = data.length === 0 && pendencias === 0;

  const marcarLida = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notificacoes", user?.id] });
    qc.invalidateQueries({ queryKey: ["notificacoes-count", user?.id] });
  };

  const marcarTodasLidas = async () => {
    if (naoLidas.length === 0) return;
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user!.id)
      .eq("lida", false);
    qc.invalidateQueries({ queryKey: ["notificacoes", user?.id] });
    qc.invalidateQueries({ queryKey: ["notificacoes-count", user?.id] });
    toast.success("Todas marcadas como lidas");
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={BellRing}
        badge="Alertas"
        title={
          <>
            Notifica<span className="text-gradient-warm">ções</span>
          </>
        }
        description="Mensagens e atualizações da comunidade."
      />

      {/* Avaliações pendentes no topo */}
      {pendencias > 0 && <PendenciasAvaliacaoCard />}

      {/* Cabeçalho da lista com ação marcar todas */}
      {data.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {naoLidas.length > 0
              ? `${naoLidas.length} não lida${naoLidas.length > 1 ? "s" : ""}`
              : "Todas lidas"}
          </p>
          {naoLidas.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-primary"
              onClick={marcarTodasLidas}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      )}

      {semNada ? (
        <div className="card-soft p-10 text-center flex flex-col items-center gap-3">
          <Bell className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação por enquanto.
          </p>
        </div>
      ) : data.length > 0 ? (
        <div className="flex flex-col gap-2">
          {data.map((n: any) => (
            <NotificacaoCard key={n.id} n={n} onLida={marcarLida} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default Notificacoes;
