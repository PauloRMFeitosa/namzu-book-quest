import { motion } from "framer-motion";
import { ArrowLeft, Share2, Users, Flame, BookOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ClubeDetalhe } from "@/hooks/clubes/useClube";

interface Props {
  clube: ClubeDetalhe;
  isMembro: boolean;
  isPendente?: boolean;
  onEntrar: () => void;
  onSair: () => void;
  loading?: boolean;
}

export const ClubeHeader = ({ clube, isMembro, isPendente, onEntrar, onSair, loading }: Props) => {
  const navigate = useNavigate();

  const compartilhar = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: clube.nome, url });
      } catch {/* ignore */}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const initials =
    (clube.curador?.nome_exibicao || clube.curador?.username || "C")
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "C";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-col"
    >
      <button
        onClick={() => navigate("/clubes")}
        className="self-start flex items-center gap-1 text-muted-foreground hover:text-foreground -ml-2 p-2 mb-2 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Clubes
      </button>

      {/* Capa */}
      <div className="relative h-44 sm:h-56 rounded-[var(--radius)] overflow-hidden border border-border/60">
        {clube.imagem_capa_url ? (
          <img src={clube.imagem_capa_url} alt={clube.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-warm flex items-center justify-center">
            <BookOpen className="w-14 h-14 text-primary-foreground/70" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute top-3 right-3">
          <Button
            size="icon"
            variant="secondary"
            onClick={compartilhar}
            className="rounded-full bg-card/90 backdrop-blur border border-border/40 hover:bg-card"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Identidade */}
      <div className="px-1 pt-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${clube.visibilidade === "privado" ? "bg-accent/20 text-accent" : "bg-primary/15 text-primary"}`}>
            {clube.visibilidade === "privado" ? "Privado" : "Público"}
          </span>
          {clube.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">{clube.nome}</h1>

        {clube.descricao && (
          <p className="text-sm text-muted-foreground leading-relaxed">{clube.descricao}</p>
        )}

        {/* Curador + métricas */}
        <div className="flex items-center gap-3 pt-1">
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src={clube.curador?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Curado por</p>
            <p className="text-sm font-medium truncate">
              {clube.curador?.nome_exibicao || clube.curador?.username || "Curador"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {clube.membros_count}
            </span>
            {clube.engagement_score > 0 && (
              <span className="flex items-center gap-1 text-accent font-medium">
                <Flame className="w-3.5 h-3.5" /> {Math.round(clube.engagement_score)}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        {!isMembro && (
          <div className="pt-2">
            <Button
              onClick={onEntrar}
              disabled={loading || isPendente}
              className="w-full h-11 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground shadow-glow disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPendente ? (
                "Aguardando aprovação"
              ) : (
                "Solicitar entrada"
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.section>
  );
};
