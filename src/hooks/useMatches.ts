import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Match = {
  outro_user_id: string;
  compatibilidade: number;
  motivos: string[];
  nome_exibicao: string | null;
  username: string | null;
  avatar_url: string | null;
  total_lidos: number;
};

export function useMeusMatches(limite = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["matches", user?.id],
    enabled: !!user,
    staleTime: 15 * 60 * 1000, // matches mudam pouco — cache 15min
    queryFn: async (): Promise<Match[]> => {
      const { data, error } = await supabase.rpc("get_meus_matches", {
        p_limite: limite,
      });
      if (error) throw error;
      return (data ?? []) as Match[];
    },
  });
}

export function useRecalcularMatches() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("recalcular_meus_matches");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches", user?.id] });
      toast.success("Compatibilidades atualizadas!");
    },
    onError: () => toast.error("Erro ao calcular compatibilidade."),
  });
}
