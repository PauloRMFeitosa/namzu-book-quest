import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  icon?: LucideIcon;
  badge: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  /** Cor do domínio: menta para clube, azul-céu para leitura. Sem tom, fica neutro. */
  tom?: "clube" | "leitura";
}

const FUNDO_DO_TOM = {
  clube: "bg-secondary border-secondary",
  leitura: "bg-accent/15 border-accent/30",
} as const;

export const PageHero = ({
  icon: Icon,
  badge,
  title,
  description,
  className,
  children,
  tom,
}: PageHeroProps) => (
  <motion.header
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={cn(
      "relative overflow-hidden rounded-[var(--radius)] border px-5 py-7",
      tom ? FUNDO_DO_TOM[tom] : "border-border/60 bg-gradient-paper",
      className
    )}
  >
    {!tom && <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />}
    <div className="relative flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{badge}</span>
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          {description}
        </p>
      )}
      {children}
    </div>
  </motion.header>
);
