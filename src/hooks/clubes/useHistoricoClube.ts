import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import type { HistoricoDoClube } from "@/lib/painelOrganizador";

/** Leitura e participação por semana e últimos encontros (função `clube_painel_historico`). */
export const useHistoricoClube = (clubeId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.historico(clubeId ?? ""),
    enabled: !!clubeId && habilitado,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<HistoricoDoClube> => {
      const { data, error } = await supabase.rpc("clube_painel_historico", { p_clube_id: clubeId });
      if (error) throw error;
      return data as unknown as HistoricoDoClube;
    },
  });
