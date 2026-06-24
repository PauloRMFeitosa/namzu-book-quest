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
  categoria?: string | null;
  raridade?: string | null;
  meta_valor?: number | null;
  meta_categoria?: string | null;
};

const UNIDADE_POR_CATEGORIA: Record<string, string> = {
  leitura:             "livros",
  consistencia:        "dias",
  conhecimento:        "insights",
  comunidade_clubes:   "clubes",
  comunidade_posts:    "publicações",
  comunidade_curtidas: "curtidas",
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

      const { data: meusPosts } = await supabase
        .from("clube_posts")
        .select("curtidas_count")
        .eq("user_id", user!.id);
      const curtidas = (meusPosts ?? []).reduce(
        (s: number, p: any) => s + (p.curtidas_count ?? 0),
        0,
      );

      const counts: Record<string, number> = {
        leitura:             (leiturasConcRes.data ?? []).length,
        consistencia:        streak?.atual ?? 0,
        conhecimento:        insightsCount,
        comunidade_clubes:   (clubesRes.data ?? []).length,
        comunidade_posts:    (postsRes.data ?? []).length,
        comunidade_curtidas: curtidas,
      };

      const owned = new Set((ownedRes.data ?? []).map((r: any) => r.conquista_id));
      const todas = ((conqRes.data ?? []) as unknown) as Conquista[];

      let melhor: {
        conquista: Conquista;
        falta: number;
        unidade: string;
        atual: number;
        meta: number;
      } | null = null;

      for (const c of todas) {
        if (owned.has(c.id)) continue;
        // usa meta_valor/meta_categoria do banco (elimina META_POR_CODIGO)
        if (!c.meta_valor || !c.meta_categoria) continue;

        const cat = c.meta_categoria;
        const atual = counts[cat] ?? 0;
        const falta = Math.max(0, c.meta_valor - atual);
        if (falta === 0) continue;

        if (!melhor || falta < melhor.falta) {
          melhor = {
            conquista: c,
            falta,
            unidade: UNIDADE_POR_CATEGORIA[cat] ?? "",
            atual,
            meta: c.meta_valor,
          };
        }
      }
      return melhor;
    },
  });
};
