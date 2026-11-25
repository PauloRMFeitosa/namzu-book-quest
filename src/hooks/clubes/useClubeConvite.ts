import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";

// Cartão público do clube, lido pela RPC `clube_convite` (funciona sem login).
export interface ClubeConvite {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_capa_url: string | null;
  visibilidade: string;
  curador_nome: string | null;
  curador_avatar_url: string | null;
  membros_count: number;
  leitura_titulo: string | null;
  leitura_capa_url: string | null;
}

export const useClubeConvite = (clubeId: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.clubes.convite(clubeId ?? ""),
    enabled: !!clubeId,
    queryFn: async (): Promise<ClubeConvite | null> => {
      const { data, error } = await supabase.rpc("clube_convite", { p_clube_id: clubeId! });
      if (error) throw error;
      return (data?.[0] as ClubeConvite | undefined) ?? null;
    },
  });
