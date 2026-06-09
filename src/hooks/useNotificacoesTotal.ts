import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Total de notificações não lidas para o badge do sino.
 * Avaliações pendentes também entram aqui via trigger (tipo='avaliacao_pendente').
 */
export function useNotificacoesTotal() {
  const { user } = useAuth();
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
  return data;
}
