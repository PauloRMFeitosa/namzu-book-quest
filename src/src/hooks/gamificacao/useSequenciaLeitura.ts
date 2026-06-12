import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useSequenciaLeitura = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sequencia-leitura", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("calcular_streak_leitura", {
        _user_id: user!.id,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { atual: row?.atual ?? 0, maximo: row?.maximo ?? 0 };
    },
  });
};
