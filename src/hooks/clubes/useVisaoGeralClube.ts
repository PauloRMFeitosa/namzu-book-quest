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
    // O organizador volta a esta tela logo depois de criar um livro, um
    // encontro ou um convite, e o roteiro e as pendências precisam refletir
    // isso na hora: sempre confere ao abrir.
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<VisaoGeralClube> => {
      const { data, error } = await supabase.rpc("clube_visao_geral", { p_clube_id: clubeId! });
      if (error) throw error;
      return data as unknown as VisaoGeralClube;
    },
  });
