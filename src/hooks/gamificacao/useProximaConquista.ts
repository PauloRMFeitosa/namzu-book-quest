import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSequenciaLeitura } from "./useSequenciaLeitura";

type Conquista = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  xp_recompensa: number;
  categoria: string | null;
};

// metas implícitas pelo código
const META_POR_CODIGO: Record<string, { meta: number; unidade: string; categoria: string }> = {
  leitura_1: { meta: 1, unidade: "livros", categoria: "leitura" },
  leitura_5: { meta: 5, unidade: "livros", categoria: "leitura" },
  leitura_10: { meta: 10, unidade: "livros", categoria: "leitura" },
  leitura_50: { meta: 50, unidade: "livros", categoria: "leitura" },
  leitura_100: { meta: 100, unidade: "livros", categoria: "leitura" },
  consistencia_7: { meta: 7, unidade: "dias", categoria: "consistencia" },
  consistencia_30: { meta: 30, unidade: "dias", categoria: "consistencia" },
  consistencia_100: { meta: 100, unidade: "dias", categoria: "consistencia" },
  conhecimento_1: { meta: 1, unidade: "insights", categoria: "conhecimento" },
  conhecimento_10: { meta: 10, unidade: "insights", categoria: "conhecimento" },
  conhecimento_100: { meta: 100, unidade: "insights", categoria: "conhecimento" },
  comunidade_1: { meta: 1, unidade: "clubes", categoria: "comunidade" },
  comunidade_50: { meta: 50, unidade: "publicações", categoria: "comunidade" },
  comunidade_500: { meta: 500, unidade: "curtidas", categoria: "comunidade" },
};

export const useProximaConquista = () => {
  const { user } = useAuth();
  const { data: streak } = useSequenciaLeitura();

  return useQuery({
    queryKey: ["proxima-conquista", user?.id, streak?.atual],
    enabled: !!user,
    queryFn: async () => {
      const [conqRes, ownedRes, leiturasConcRes, leiturasRes, postsRes, clubesRes] =
        await Promise.all([
          supabase.from("conquistas").select("*"),
          supabase.from("usuario_conquistas").select("conquista_id").eq("user_id", user!.id),
          supabase
            .from("usuario_leituras")
            .select("id, usuario_livros!inner(user_id)")
            .eq("status", "concluido")
            .eq("usuario_livros.user_id", user!.id),
          supabase.from("leituras").select("id").eq("user_id", user!.id),
          supabase.from("clube_posts").select("id").eq("user_id", user!.id),
          supabase
            .from("clube_membros")
            .select("clube_id")
            .eq("user_id", user!.id)
            .eq("status", "ativo"),
        ]);

      const myLeituraIds = (leiturasRes.data ?? []).map((l: any) => l.id);
      let insightsCount = 0;
      if (myLeituraIds.length) {
        const [c1, c2] = await Promise.all([
          supabase
            .from("leitura_conteudo")
            .select("id", { count: "exact", head: true })
            .in("leitura_id", myLeituraIds),
          supabase
            .from("leitura_citacoes")
            .select("id", { count: "exact", head: true })
            .in("leitura_id", myLeituraIds),
        ]);
        insightsCount = (c1.count ?? 0) + (c2.count ?? 0);
      }

      const counts: Record<string, number> = {
        leitura: (leiturasConcRes.data ?? []).length,
        consistencia: streak?.atual ?? 0,
        conhecimento: insightsCount,
        comunidade_clubes: (clubesRes.data ?? []).length,
        comunidade_posts: (postsRes.data ?? []).length,
        comunidade_curtidas: 0, // TODO: somar de clube_posts.curtidas_count posts próprios
      };
      // soma curtidas recebidas
      const { data: meusPosts } = await supabase
        .from("clube_posts")
        .select("curtidas_count")
        .eq("user_id", user!.id);
      counts.comunidade_curtidas = (meusPosts ?? []).reduce(
        (s: number, p: any) => s + (p.curtidas_count ?? 0),
        0,
      );

      const owned = new Set((ownedRes.data ?? []).map((r: any) => r.conquista_id));
      const todas = (conqRes.data ?? []) as Conquista[];

      let melhor: { conquista: Conquista; falta: number; unidade: string; atual: number; meta: number } | null = null;
      for (const c of todas) {
        if (owned.has(c.id)) continue;
        const meta = META_POR_CODIGO[c.codigo];
        if (!meta) continue;
        let atual = 0;
        if (meta.categoria === "leitura") atual = counts.leitura;
        else if (meta.categoria === "consistencia") atual = counts.consistencia;
        else if (meta.categoria === "conhecimento") atual = counts.conhecimento;
        else if (c.codigo === "comunidade_1") atual = counts.comunidade_clubes;
        else if (c.codigo === "comunidade_50") atual = counts.comunidade_posts;
        else if (c.codigo === "comunidade_500") atual = counts.comunidade_curtidas;
        const falta = Math.max(0, meta.meta - atual);
        if (falta === 0) continue;
        if (!melhor || falta < melhor.falta) {
          melhor = { conquista: c, falta, unidade: meta.unidade, atual, meta: meta.meta };
        }
      }
      return melhor;
    },
  });
};
