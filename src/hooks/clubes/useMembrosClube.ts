import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MembroClube {
  user_id: string;
  data_entrada: string;
  status: string;
  papel: "membro" | "moderador";
  is_curador: boolean;
  perfil: {
    user_id: string;
    username: string | null;
    nome_exibicao: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  xp: number;
  nivel: number;
  streak: number;
}

export const useMembrosClube = (clubeId: string | undefined, curadorId?: string) => {
  return useQuery({
    queryKey: ["clube-membros-list", clubeId],
    enabled: !!clubeId,
    queryFn: async (): Promise<MembroClube[]> => {
      const { data: membros, error } = await supabase
        .from("clube_membros")
        .select("user_id, data_entrada, status, papel")
        .eq("clube_id", clubeId!)
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      const ids = (membros ?? []).map((m) => m.user_id);
      if (!ids.length) return [];

      const [perfis, gam] = await Promise.all([
        supabase
          .from("perfis")
          .select("user_id, username, nome_exibicao, avatar_url, bio")
          .in("user_id", ids),
        supabase
          .from("gamificacao_perfis")
          .select("user_id, xp_total, nivel, streak_atual")
          .in("user_id", ids),
      ]);
      const pMap = new Map((perfis.data ?? []).map((p: any) => [p.user_id, p]));
      const gMap = new Map((gam.data ?? []).map((g: any) => [g.user_id, g]));

      return (membros ?? []).map((m: any) => {
        const g: any = gMap.get(m.user_id) ?? {};
        return {
          user_id: m.user_id,
          data_entrada: m.data_entrada,
          status: m.status,
          papel: (m.papel ?? "membro") as "membro" | "moderador",
          is_curador: curadorId === m.user_id,
          perfil: pMap.get(m.user_id) ?? null,
          xp: g.xp_total ?? 0,
          nivel: g.nivel ?? 1,
          streak: g.streak_atual ?? 0,
        };
      });
    },
  });
};
