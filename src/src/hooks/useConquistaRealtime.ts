import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Escuta INSERT em usuario_conquistas via Supabase Realtime.
 * Quando uma nova conquista é desbloqueada, exibe um toast comemorativo
 * e invalida as queries relevantes de gamificação.
 *
 * Deve ser montado uma única vez no AppLayout ou num provider global.
 */
export function useConquistaRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`conquistas-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "usuario_conquistas",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Buscar detalhes da conquista para o toast
          const conquistaId = (payload.new as any).conquista_id;
          const { data: conquista } = await supabase
            .from("conquistas")
            .select("nome, xp_recompensa")
            .eq("id", conquistaId)
            .maybeSingle();

          const nome = conquista?.nome ?? "Nova conquista";
          const xp   = conquista?.xp_recompensa ?? 0;

          toast("🏆 Conquista desbloqueada!", {
            description: `${nome}${xp > 0 ? ` · +${xp} XP` : ""}`,
            duration: 6000,
            style: {
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              border: "none",
              fontWeight: "600",
            },
          });

          // Invalida queries de gamificação e notificações
          qc.invalidateQueries({ queryKey: ["minhas-conquistas", user.id] });
          qc.invalidateQueries({ queryKey: ["notificacoes-count", user.id] });
          qc.invalidateQueries({ queryKey: ["notificacoes", user.id] });
          qc.invalidateQueries({ queryKey: ["gamificacao"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}
