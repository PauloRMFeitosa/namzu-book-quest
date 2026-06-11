import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsSeguindo, useSeguirMutation } from "@/hooks/social/useSeguir";

interface BotaoSeguirProps {
  /** ID do usuário a ser seguido/desseguido */
  seguidoId: string;
  /** Tamanho do botão. Default: "default" */
  size?: "sm" | "default" | "lg";
  className?: string;
}

/**
 * Botão com toggle seguir/deixar de seguir.
 * Usa update otimista: a UI muda imediatamente, rollback em caso de erro.
 * Não renderiza nada se o usuário atual é o próprio perfil.
 */
export function BotaoSeguir({ seguidoId, size = "default", className }: BotaoSeguirProps) {
  const { user } = useAuth();
  const { data: isSeguindo, isLoading: checkando } = useIsSeguindo(seguidoId);
  const { seguir, desseguir } = useSeguirMutation(seguidoId);

  // Não exibe para o próprio usuário
  if (!user || user.id === seguidoId) return null;

  const loading = checkando || seguir.isPending || desseguir.isPending;

  const handleClick = () => {
    if (loading) return;
    if (isSeguindo) {
      desseguir.mutate();
    } else {
      seguir.mutate();
    }
  };

  if (isSeguindo) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={loading}
        className={className}
        aria-label="Deixar de seguir"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserCheck className="w-4 h-4" />
        )}
        {size !== "sm" && <span className="ml-1.5">Seguindo</span>}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
      aria-label="Seguir"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {size !== "sm" && <span className="ml-1.5">Seguir</span>}
    </Button>
  );
}
