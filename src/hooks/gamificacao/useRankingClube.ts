import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function semanaAtual(): { inicio: string; fim: string } {
  const hoje = new Date();
  const dia = hoje.getDay(); // 0 = dom
  const diff = dia === 0 ? -6 : 1 - dia; // segunda-feira
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() + diff);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return {
    inicio: inicio.toISOString().split("T")[0],
    fim:    fim.toISOString().split("T")[0],
  };
}

export const useRankingClube = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ranking-clube-home", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: membros } = await supabase
        .from("clube_membros")
        .select("clube_id, clubes(id, nome, imagem_capa_url)")
        .eq("user_id", user!.id)
        .eq("status", "ativo")
        .limit(1);

      const clube: any = membros?.[0]?.clubes;
      if (!clube) return null;

      const semana = semanaAtual();

      // Liga semanal: lê clube_temporadas_ranking
      const { data: semanaData } = await supabase
        .from("clube_temporadas_ranking" as any)
        .select("user_id, xp_na_semana")
        .eq("clube_id", clube.id)
        .eq("semana_inicio", semana.inicio)
        .order("xp_na_semana", { ascending: false });

      // Fallback para XP total se ainda não há dados semanais
      const ranking: { user_id: string; xp: number }[] = (semanaData?.length
        ? semanaData.map((r: any) => ({ user_id: r.user_id, xp: r.xp_na_semana }))
        : await (async () => {
            const { data: outros } = await supabase
              .from("clube_membros")
              .select("user_id")
              .eq("clube_id", clube.id)
              .eq("status", "ativo");
            const ids = (outros ?? []).map((m: any) => m.user_id);
            if (!ids.length) return [];
            const { data: perfis } = await supabase
              .from("gamificacao_perfis")
              .select("user_id, xp_total")
              .in("user_id", ids)
              .order("xp_total", { ascending: false });
            return (perfis ?? []).map((p: any) => ({ user_id: p.user_id, xp: p.xp_total }));
          })());

      if (!ranking.length) return { clube, top: [], minhaPosicao: null, semana };

      const minhaPosicao = ranking.findIndex((p) => p.user_id === user!.id);
      const ids = ranking.slice(0, 5).map((p) => p.user_id);

      const { data: profiles } = await supabase
        .from("perfis")
        .select("user_id, nome_exibicao")
        .in("user_id", ids);
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.nome_exibicao]));

      const top = ranking.slice(0, 5).map((p, idx) => ({
        posicao: idx + 1,
        user_id: p.user_id,
        nome:    nameMap.get(p.user_id) ?? "Leitor",
        xp:      p.xp,
        isMe:    p.user_id === user!.id,
      }));

      return {
        clube,
        top,
        minhaPosicao: minhaPosicao >= 0 ? minhaPosicao + 1 : null,
        semana,
        isSemanal: (semanaData?.length ?? 0) > 0,
      };
    },
  });
};
