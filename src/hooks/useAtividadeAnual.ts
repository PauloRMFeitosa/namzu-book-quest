import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";

/**
 * Atividade diária de leitura do ano corrente, agregada a partir de
 * leitura_progresso via RPC get_atividade_leitura_anual (security definer,
 * necessária para exibir o mapa em perfis públicos de outros usuários).
 * Retorna um mapa `{ "AAAA-MM-DD": totalPaginas }` — dias sem registro
 * simplesmente não aparecem no objeto.
 */
export function useAtividadeAnual(userId?: string) {
  return useQuery({
    queryKey: queryKeys.perfil.atividadeAnual(userId ?? ""),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.rpc("get_atividade_leitura_anual", {
        p_user_id: userId ?? null,
      });
      if (error) throw error;

      const porDia: Record<string, number> = {};
      for (const registro of data ?? []) {
        if (!registro.dia) continue;
        porDia[registro.dia] = Number(registro.total_paginas) || 0;
      }
      return porDia;
    },
  });
}
