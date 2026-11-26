import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import type { PainelDoAdmin } from "@/lib/adminPainel";

/** Números do painel do Admin (função `admin_painel`, só para admins). */
export const useAdminPainel = (dias: number) =>
  useQuery({
    queryKey: queryKeys.admin.painel(dias),
    // Painel de acompanhamento: vale buscar de novo ao abrir.
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<PainelDoAdmin> => {
      const { data, error } = await supabase.rpc("admin_painel", { p_dias: dias });
      if (error) throw error;
      return data as unknown as PainelDoAdmin;
    },
  });
