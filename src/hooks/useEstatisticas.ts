import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LivrosPorMes = { mes: string; total: number };
export type GenerosLidos = { genero: string; total: number };
export type StatsLeitura = {
  total_lidos: number;
  total_citacoes: number;
  streak_atual: number;
  paginas_estimadas: number;
};

export function useLivrosPorMes(userId?: string) {
  return useQuery({
    queryKey: ["livros-por-mes", userId],
    enabled: true,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<LivrosPorMes[]> => {
      const { data, error } = await supabase.rpc("get_livros_por_mes", {
        p_user_id: userId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as LivrosPorMes[];
    },
  });
}

export function useGenerosLidos(userId?: string) {
  return useQuery({
    queryKey: ["generos-lidos", userId],
    enabled: true,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<GenerosLidos[]> => {
      const { data, error } = await supabase.rpc("get_generos_lidos", {
        p_user_id: userId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as GenerosLidos[];
    },
  });
}

export type InteracaoDiaria = {
  dia: string;
  percentual: number;
  categorias: string;
};

export function useInteracoesDiarias(userId?: string, dias = 14) {
  return useQuery({
    queryKey: ["interacoes-diarias", userId, dias],
    enabled: true,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<InteracaoDiaria[]> => {
      const { data, error } = await supabase.rpc("get_interacoes_diarias", {
        p_user_id: userId ?? null,
        p_dias: dias,
      });
      if (error) throw error;
      return (data ?? []) as InteracaoDiaria[];
    },
  });
}

export function useStatsLeitura(userId?: string) {
  return useQuery({
    queryKey: ["stats-leitura", userId],
    enabled: true,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StatsLeitura | null> => {
      const { data, error } = await supabase.rpc("get_stats_leitura", {
        p_user_id: userId ?? null,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}
