import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Emoji alternativo ao ícone */
  emoji?: string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  /** "page" = centralizado e com mais espaçamento; "inline" = compacto */
  variant?: "page" | "inline";
}

/**
 * Componente reutilizável de estado vazio.
 *
 * Uso:
 * ```tsx
 * <EmptyState
 *   icon={BookOpen}
 *   title="Nenhum livro ainda"
 *   description="Adicione livros para começar sua jornada."
 *   action={{ label: "Buscar livros", onClick: () => navigate("/busca") }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "inline",
}: EmptyStateProps) {
  const isPage = variant === "page";

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        isPage ? "gap-4 py-16 px-6" : "gap-3 py-10 px-4",
        className
      )}
    >
      {/* Ícone ou emoji */}
      {emoji ? (
        <span
          className={cn(
            "leading-none select-none",
            isPage ? "text-5xl" : "text-4xl"
          )}
          aria-hidden="true"
        >
          {emoji}
        </span>
      ) : Icon ? (
        <div
          className={cn(
            "rounded-2xl bg-muted flex items-center justify-center text-muted-foreground",
            isPage ? "w-16 h-16" : "w-12 h-12"
          )}
        >
          <Icon className={cn(isPage ? "w-8 h-8" : "w-6 h-6")} />
        </div>
      ) : null}

      {/* Texto */}
      <div className="flex flex-col gap-1.5">
        <p
          className={cn(
            "font-semibold leading-tight",
            isPage ? "text-lg" : "text-sm"
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              "text-muted-foreground max-w-xs mx-auto leading-relaxed",
              isPage ? "text-sm" : "text-xs"
            )}
          >
            {description}
          </p>
        )}
      </div>

      {/* Ações */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant ?? "default"}
              className={cn(
                "rounded-2xl",
                isPage ? "h-11 px-6" : "h-9 px-4 text-sm"
              )}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant ?? "outline"}
              className={cn(
                "rounded-2xl",
                isPage ? "h-11 px-6" : "h-9 px-4 text-sm"
              )}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
