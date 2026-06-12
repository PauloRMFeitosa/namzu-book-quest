import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Citacao = {
  id: string;
  texto: string;
  pagina: number | null;
  created_at: string;
  obra_id: string;
  obra_titulo: string;
  obra_capa: string | null;
  autor_nome: string | null;
};

export function useCitacoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["citacoes", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Citacao[]> => {
      const { data, error } = await supabase.rpc("get_minhas_citacoes");
      if (error) throw error;
      return (data ?? []) as Citacao[];
    },
  });
}
