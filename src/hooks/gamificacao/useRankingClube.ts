import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useRankingClube = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ranking-clube-home", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // pega o primeiro clube ativo do usuário
      const { data: membros } = await supabase
        .from("clube_membros")
        .select("clube_id, clubes(id, nome, imagem_capa_url)")
        .eq("user_id", user!.id)
        .eq("status", "ativo")
        .limit(1);

      const clube: any = membros?.[0]?.clubes;
      if (!clube) return null;

      const { data: outros } = await supabase
        .from("clube_membros")
        .select("user_id")
        .eq("clube_id", clube.id)
        .eq("status", "ativo");
      const userIds = (outros ?? []).map((m: any) => m.user_id);
      if (!userIds.length) return { clube, top: [], minhaPosicao: null };

      const { data: perfis } = await supabase
        .from("gamificacao_perfis")
        .select("user_id, xp_total, streak_atual")
        .in("user_id", userIds)
        .order("xp_total", { ascending: false });

      const ranking = perfis ?? [];
      const minhaPosicao = ranking.findIndex((p: any) => p.user_id === user!.id);

      // nomes
      const ids = ranking.slice(0, 5).map((p: any) => p.user_id);
      const { data: profiles } = await supabase
        .from("perfis")
        .select("user_id, nome_exibicao")
        .in("user_id", ids);
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.nome_exibicao]));

      const top = ranking.slice(0, 5).map((p: any, idx: number) => ({
        posicao: idx + 1,
        user_id: p.user_id,
        nome: nameMap.get(p.user_id) ?? "Leitor",
        xp: p.xp_total,
        streak: p.streak_atual,
        isMe: p.user_id === user!.id,
      }));

      return { clube, top, minhaPosicao: minhaPosicao >= 0 ? minhaPosicao + 1 : null };
    },
  });
};
