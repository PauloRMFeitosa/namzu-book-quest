import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Total de notificações não lidas para o badge do sino.
 * Atualiza em tempo real via Supabase Realtime quando chegam novas notificações.
 */
export function useNotificacoesTotal() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const { data = 0 } = useQuery({
    queryKey: ["notificacoes-count", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notificacoes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("lida", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Realtime: invalidar contagem ao receber INSERT ou UPDATE em notificacoes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notificacoes-badge-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notificacoes-count", userId] });
          qc.invalidateQueries({ queryKey: ["notificacoes", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return data;
}
