import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Flame, BookOpen, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ClubeCardData } from "@/hooks/clubes/useClubes";

interface Props {
  clube: ClubeCardData;
  variant?: "grid" | "carousel";
  /** exibe pílula "Curador" sobre a capa quando o usuário logado é o curador do clube */
  ehCurador?: boolean;
}

export const ClubeCard = ({ clube, variant = "grid", ehCurador = false }: Props) => {
  const navigate = useNavigate();
  const widthClass = variant === "carousel" ? "min-w-[260px] w-[260px]" : "w-full";

  const initials =
    (clube.curador?.nome_exibicao || clube.curador?.username || "C")
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "C";

  return (
    <motion.button
      onClick={() => navigate(`/clubes/${clube.id}`)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`${widthClass} text-left card-editorial flex flex-col snap-start group`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-warm">
        {clube.imagem_capa_url ? (
          <img
            src={clube.imagem_capa_url}
            alt={clube.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-warm flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary-foreground/70" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {ehCurador && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <Crown className="w-3 h-3" /> Curador
          </span>
        )}
        {clube.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {clube.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full bg-card/90 backdrop-blur text-[10px] font-medium text-foreground border border-border/40"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 flex-1">
        <h3 className="font-display text-lg leading-tight font-semibold text-foreground line-clamp-2">
          {clube.nome}
        </h3>
        {clube.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {clube.descricao}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center gap-2 border-t border-border/60">
          <Avatar className="w-6 h-6">
            <AvatarImage src={clube.curador?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-secondary">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate flex-1">
            {clube.curador?.nome_exibicao || clube.curador?.username || "Curador"}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{clube.membros_count}</span>
          </div>
          {clube.engagement_score > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-accent font-medium">
              <Flame className="w-3 h-3" />
              <span>{Math.round(clube.engagement_score)}</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
};
