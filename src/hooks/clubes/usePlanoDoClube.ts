import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import type { MeuPlano, PlanoDoClube } from "@/lib/planoDoClube";

// Cast temporário: sai quando os tipos forem regenerados após a migração `planos_limites`.
const banco = supabase as any;

/** Plano que vale para o clube e o uso dos limites (função `clube_plano`, só para quem gere). */
export const usePlanoDoClube = (clubeId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.plano(clubeId ?? ""),
    enabled: !!clubeId && habilitado,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<PlanoDoClube> => {
      const { data, error } = await banco.rpc("clube_plano", { p_clube_id: clubeId });
      if (error) throw error;
      return data as PlanoDoClube;
    },
  });

/** Plano de quem está logado e quantos clubes já organiza (função `meu_plano`). */
export const useMeuPlano = (habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.meuPlano,
    enabled: habilitado,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<MeuPlano> => {
      const { data, error } = await banco.rpc("meu_plano");
      if (error) throw error;
      return data as MeuPlano;
    },
  });
