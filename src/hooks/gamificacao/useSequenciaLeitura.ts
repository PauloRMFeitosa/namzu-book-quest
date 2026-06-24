import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useSequenciaLeitura = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sequencia-leitura", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("gamificacao_perfis")
        .select("streak_atual, streak_maximo, streak_freezes_disponiveis")
        .eq("user_id", user!.id)
        .maybeSingle();
      return {
        atual: data?.streak_atual ?? 0,
        maximo: data?.streak_maximo ?? 0,
        freezes: (data as any)?.streak_freezes_disponiveis ?? 0,
      };
    },
  });
};
