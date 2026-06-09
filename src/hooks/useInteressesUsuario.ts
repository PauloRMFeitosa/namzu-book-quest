import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type InteresseUsuario = {
  interesse_id: string;
  peso: number;
  nome: string;
  icone: string | null;
  descricao: string | null;
};

/**
 * Retorna os interesses cadastrados do usuário (perfil_interesses + interesses).
 * Base do Código ME do Leitor. Futuramente os pesos serão recalculados
 * automaticamente a partir de leituras, gêneros, favoritos e insights.
 */
export const useInteressesUsuario = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["perfil-interesses", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<InteresseUsuario[]> => {
      const { data, error } = await supabase
        .from("perfil_interesses")
        .select("interesse_id,peso,interesses(nome,icone,descricao,categoria,ativo)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          interesse_id: r.interesse_id,
          peso: r.peso ?? 100,
          nome: r.interesses?.nome ?? "",
          icone: r.interesses?.icone ?? null,
          descricao: r.interesses?.descricao ?? null,
        }))
        .sort((a, b) => (b.peso ?? 0) - (a.peso ?? 0) || a.nome.localeCompare(b.nome));
    },
  });
};
