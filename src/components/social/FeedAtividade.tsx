import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Award, BookMarked, BookCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── tipos ───────────────────────────────────────────────────────────────────

interface AtividadeItem {
  tipo: string;
  ator_id: string;
  ator_nome: string;
  ator_username: string;
  ator_avatar: string | null;
  referencia_id: string;
  referencia_nome: string;
  referencia_capa: string | null;
  ocorreu_em: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<
  string,
  { icon: typeof BookOpen; label: string; cor: string }
> = {
  livro_adicionado: {
    icon: BookMarked,
    label: "adicionou à lista",
    cor: "text-blue-500",
  },
  livro_iniciado: {
    icon: BookOpen,
    label: "começou a ler",
    cor: "text-primary",
  },
  livro_concluido: {
    icon: BookCheck,
    label: "concluiu",
    cor: "text-green-600",
  },
  conquista_desbloqueada: {
    icon: Award,
    label: "desbloqueou conquista",
    cor: "text-yellow-500",
  },
};

function initials(nome: string) {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── card de atividade ────────────────────────────────────────────────────────

function AtividadeCard({ item }: { item: AtividadeItem }) {
  const cfg = TIPO_CONFIG[item.tipo] ?? {
    icon: BookOpen,
    label: item.tipo,
    cor: "text-muted-foreground",
  };
  const Icon = cfg.icon;
  const quando = formatDistanceToNow(new Date(item.ocorreu_em), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="flex gap-3 items-start py-3 border-b border-border/60 last:border-0">
      {/* Avatar */}
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={item.ator_avatar ?? undefined} alt={item.ator_nome} />
        <AvatarFallback className="text-xs font-semibold bg-secondary text-secondary-foreground">
          {initials(item.ator_nome ?? "?")}
        </AvatarFallback>
      </Avatar>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold">{item.ator_nome}</span>{" "}
          <span className="text-muted-foreground">{cfg.label}</span>{" "}
          <span className="font-medium">«{item.referencia_nome}»</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{quando}</p>
      </div>

      {/* Ícone de tipo */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center ${cfg.cor}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Capa do livro (quando disponível) */}
      {item.referencia_capa && (
        <div className="shrink-0 w-9 aspect-[2/3] rounded overflow-hidden border border-border/60">
          <img
            src={item.referencia_capa}
            alt={item.referencia_nome}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

// ─── componente principal ────────────────────────────────────────────────────

interface FeedAtividadeProps {
  limite?: number;
  className?: string;
}

export function FeedAtividade({ limite = 30, className }: FeedAtividadeProps) {
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["feed-atividade", user?.id],
    enabled: !!user,
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("feed_atividade", {
        p_limite: limite,
      });
      if (error) throw error;
      return (data ?? []) as AtividadeItem[];
    },
  });

  if (isLoading) {
    return (
      <div className={`flex flex-col gap-3 ${className ?? ""}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div
        className={`flex flex-col items-center gap-3 py-10 text-center ${className ?? ""}`}
      >
        <BookOpen className="w-10 h-10 text-muted-foreground/40" />
        <p className="font-semibold text-sm">Nenhuma atividade recente</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Siga outros leitores para ver o que eles estão lendo por aqui.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {data.map((item, i) => (
        <AtividadeCard key={`${item.ator_id}-${item.tipo}-${i}`} item={item} />
      ))}
    </div>
  );
}
