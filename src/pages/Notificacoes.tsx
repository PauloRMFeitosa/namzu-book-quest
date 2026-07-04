import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { Bell, BellRing, Star, UserPlus, Heart, CalendarDays, CheckCheck, MessageCircle, Rss, PlayCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AvaliacaoModal } from "@/components/avaliacoes/AvaliacaoModal";

// ─── mapa de tipos → ícone + cor de destaque ───────────────────────────────
const TIPO_CONFIG: Record<string, { icon: React.ElementType; cor: string; label: string }> = {
  avaliacao_pendente:   { icon: Star,          cor: "text-amber-500",   label: "Avaliação"    },
  clube_novo_membro:    { icon: UserPlus,      cor: "text-blue-500",    label: "Novo membro"  },
  clube_curtida_post:   { icon: Heart,         cor: "text-rose-500",    label: "Curtida"      },
  clube_novo_evento:    { icon: CalendarDays,  cor: "text-violet-500",  label: "Evento"       },
  clube_novo_comentario:{ icon: MessageCircle, cor: "text-sky-500",     label: "Comentário"   },
  clube_novo_post:      { icon: Rss,           cor: "text-emerald-500", label: "Novo post"    },
  clube_novo_conteudo:  { icon: PlayCircle,    cor: "text-teal-500",    label: "Conteúdo"     },
  conquista:            { icon: Trophy,        cor: "text-yellow-500",  label: "Conquista"    },
};
const TIPO_DEFAULT = { icon: Bell, cor: "text-primary", label: "Aviso" };

// ─── Card individual ────────────────────────────────────────────────────────
const NotificacaoCard = ({
  n,
  onLida,
  onAvaliar,
  onDispensar,
}: {
  n: any;
  onLida: (id: string) => void;
  onAvaliar: (n: any) => void;
  onDispensar: (referenciaId: string, definitivo: boolean) => void;
}) => {
  const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_DEFAULT;
  const Icon = cfg.icon;
  const isAvaliacao = n.tipo === "avaliacao_pendente";

  const cardBody = (
    <div className={`card-soft p-4 flex gap-3 transition-opacity ${n.lida ? "opacity-60" : ""}`}>
      {/* Ícone de tipo */}
      <div className={`shrink-0 w-9 h-9 rounded-xl bg-muted flex items-center justify-center ${cfg.cor}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.cor}`}>
              {cfg.label}
            </span>
            <p className="font-semibold text-sm leading-snug mt-0.5">{n.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
          </div>
          {!n.lida && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />}
        </div>

        <p className="text-[10px] text-muted-foreground mt-1.5">
          {new Date(n.created_at).toLocaleString("pt-BR", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </p>

        {/* Botões de ação para avaliação pendente */}
        {isAvaliacao && !n.lida && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button
              size="sm"
              className="h-8 rounded-xl bg-primary hover:bg-primary-hover text-xs"
              onClick={(e) => { e.preventDefault(); onAvaliar(n); }}
            >
              Avaliar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs"
              onClick={(e) => { e.preventDefault(); onDispensar(n.referencia_id, false); }}
            >
              Lembrar mais tarde
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-xl text-xs text-muted-foreground"
              onClick={(e) => { e.preventDefault(); onDispensar(n.referencia_id, true); }}
            >
              Não quero avaliar
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Não lida com link → marca como lida ao navegar
  if (n.link_url && !n.lida && !isAvaliacao) {
    return <Link to={n.link_url} onClick={() => onLida(n.id)}>{cardBody}</Link>;
  }
  if (n.link_url && !isAvaliacao) {
    return <Link to={n.link_url}>{cardBody}</Link>;
  }
  return <div>{cardBody}</div>;
};

type Filtro = "todas" | "nao_lidas" | "lidas";

// ─── Página ─────────────────────────────────────────────────────────────────
const Notificacoes = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [avaliacaoAberta, setAvaliacaoAberta] = useState<{ id: string; titulo: string } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");

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
  const visiveis =
    filtro === "nao_lidas" ? data.filter((n: any) => !n.lida) :
    filtro === "lidas"     ? data.filter((n: any) => n.lida)  :
    data;

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["notificacoes", user?.id] });
    qc.invalidateQueries({ queryKey: ["notificacoes-count", user?.id] });
  };

  const marcarLida = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    invalidar();
  };

  const marcarTodasLidas = async () => {
    if (naoLidas.length === 0) return;
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user!.id)
      .eq("lida", false);
    invalidar();
    toast.success("Todas marcadas como lidas");
  };

  const handleAvaliar = (n: any) => {
    setAvaliacaoAberta({ id: n.referencia_id, titulo: n.titulo });
  };

  const handleDispensar = async (referenciaId: string, definitivo: boolean) => {
    const { error } = await supabase.rpc("dispensar_avaliacao", {
      p_usuario_livro_id: referenciaId,
      p_definitivo: definitivo,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(definitivo ? "Avaliação dispensada." : "Vamos te lembrar em 48h.");
    invalidar();
    qc.invalidateQueries({ queryKey: ["pendencias-avaliacao"] });
  };

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "todas",     label: "Todas" },
    { key: "nao_lidas", label: `Não lidas${naoLidas.length > 0 ? ` (${naoLidas.length})` : ""}` },
    { key: "lidas",     label: "Lidas" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={BellRing}
        badge="Alertas"
        title={<>Notifica<span className="text-gradient-warm">ções</span></>}
        description="Mensagens e atualizações da comunidade."
      />

      {/* Filtros + ação */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Pills de filtro */}
        <div className="flex gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`h-7 px-3 rounded-full text-xs font-medium transition-colors border ${
                filtro === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {naoLidas.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-primary shrink-0"
            onClick={marcarTodasLidas}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <div className="card-soft p-10 text-center flex flex-col items-center gap-3">
          <Bell className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {data.length === 0
              ? "Nenhuma notificação por enquanto."
              : filtro === "nao_lidas"
              ? "Nenhuma notificação não lida."
              : "Nenhuma notificação lida."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visiveis.map((n: any) => (
            <NotificacaoCard
              key={n.id}
              n={n}
              onLida={marcarLida}
              onAvaliar={handleAvaliar}
              onDispensar={handleDispensar}
            />
          ))}
        </div>
      )}

      {/* Modal de avaliação aberto a partir da notificação */}
      {avaliacaoAberta && (
        <AvaliacaoModal
          open={!!avaliacaoAberta}
          onOpenChange={(o) => { if (!o) setAvaliacaoAberta(null); }}
          usuarioLivroId={avaliacaoAberta.id}
          titulo={avaliacaoAberta.titulo}
          onSaved={() => {
            setAvaliacaoAberta(null);
            invalidar();
          }}
        />
      )}
    </div>
  );
};

export default Notificacoes;
