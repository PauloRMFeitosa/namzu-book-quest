import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import type { VisaoGeralClube } from "@/lib/visaoGeral";

// Visão geral do organizador, lida pela RPC `clube_visao_geral`. A função só
// responde ao organizador do clube e a admins.
export const useVisaoGeralClube = (clubeId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.visaoGeral(clubeId ?? ""),
    enabled: !!clubeId && habilitado,
    // O organizador abre esta tela para ver o que mudou: vale buscar de novo.
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<VisaoGeralClube> => {
      // `as any` até o types.ts ser regenerado com a função nova
      const { data, error } = await (supabase as any).rpc("clube_visao_geral", { p_clube_id: clubeId });
      if (error) throw error;
      return data as VisaoGeralClube;
    },
  });
