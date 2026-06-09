import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PendenciaAvaliacao = {
  usuario_livro_id: string;
  user_id: string;
  obra_id: string;
  titulo_original: string;
  capa_padrao_url: string | null;
  data_conclusao: string | null;
  status_avaliacao: "PENDENTE" | "DISPENSADO_TEMPORARIO";
  dispensado_em: string | null;
  avaliacao_criada_em: string;
  total_pendencias: number;
};

/**
 * Busca livros com avaliação pendente para exibição na Home e badge.
 * A view já aplica o cooldown de 7 dias para DISPENSADO_TEMPORARIO.
 * Com RLS ativo em usuario_livros, só retorna dados do usuário autenticado.
 */
export function useAvaliacoesPendentes(limit = 3) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pendencias-avaliacao", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000, // 1 min — dados mudam raramente
    queryFn: async (): Promise<PendenciaAvaliacao[]> => {
      const { data, error } = await supabase
        .from("pendencias_avaliacao_home")
        .select("*")
        .eq("user_id", user!.id)
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PendenciaAvaliacao[];
    },
  });
}

/** Contagem total de pendências (para badge). Reutiliza o cache do hook principal. */
export function usePendenciasCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pendencias-avaliacao", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    select: (data: PendenciaAvaliacao[]) => data[0]?.total_pendencias ?? 0,
    queryFn: async (): Promise<PendenciaAvaliacao[]> => {
      const { data, error } = await supabase
        .from("pendencias_avaliacao_home")
        .select("*")
        .eq("user_id", user!.id)
        .limit(3);
      if (error) throw error;
      return (data ?? []) as PendenciaAvaliacao[];
    },
  });
}
