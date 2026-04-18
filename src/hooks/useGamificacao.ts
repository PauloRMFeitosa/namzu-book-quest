import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useGamificacao = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gamificacao", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamificacao_perfis")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { xp_total: 0, nivel: 1, streak_atual: 0, streak_maximo: 0, xp_proximo_nivel: 100 };
    },
  });
};
