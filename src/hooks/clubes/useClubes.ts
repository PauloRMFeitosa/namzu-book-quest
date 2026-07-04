import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ClubeSecao =
  | "todos"
  | "em_alta"
  | "novos"
  | "mais_profundos"
  | "mais_ativos"
  | "pequenos"
  | "para_voce";

export interface ClubeCardData {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_capa_url: string | null;
  curador_id: string;
  is_ativo: boolean;
  duracao_tipo: string;
  categoria: string | null;
  visibilidade: string | null;
  created_at: string;
  // métricas (opcional)
  membros_count: number;
  ativos_7d: number;
  engagement_score: number;
  profundidade_score: number;
  // tags
  tags: string[];
  // creator
  curador?: { username: string | null; nome_exibicao: string | null; avatar_url: string | null } | null;
  // membership do usuário atual
  is_membro?: boolean;
}

interface UseClubesParams {
  busca?: string;
  categoria?: string | null;
  secao?: ClubeSecao;
}

export const useClubes = ({ busca = "", categoria = null, secao = "todos" }: UseClubesParams = {}) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clubes-marketplace", busca, categoria, secao, user?.id],
    queryFn: async (): Promise<ClubeCardData[]> => {
      // IDs de clubes privados que o usuário pode ver (curador, moderador ou membro ativo)
      let allowedPrivadoIds: string[] = [];
      const membroIds = new Set<string>();
      if (user) {
        const [curadorRes, modRes, membroRes] = await Promise.all([
          supabase.from("clubes").select("id").eq("curador_id", user.id),
          supabase
            .from("clube_membros")
            .select("clube_id")
            .eq("user_id", user.id)
            .eq("papel", "moderador")
            .eq("status", "ativo"),
          supabase
            .from("clube_membros")
            .select("clube_id")
            .eq("user_id", user.id)
            .eq("status", "ativo"),
        ]);
        const ids = new Set<string>();
        (curadorRes.data ?? []).forEach((c: any) => ids.add(c.id));
        (modRes.data ?? []).forEach((m: any) => ids.add(m.clube_id));
        (membroRes.data ?? []).forEach((m: any) => {
          ids.add(m.clube_id);
          membroIds.add(m.clube_id);
        });
        allowedPrivadoIds = Array.from(ids);
      }


      // Base clubes ativos: públicos OU privados que o usuário gerencia
      let q = (supabase as any)
        .from("clubes")
        .select("id, nome, descricao, imagem_capa_url, curador_id, is_ativo, duracao_tipo, categoria, visibilidade, created_at")
        .eq("is_ativo", true);

      if (allowedPrivadoIds.length) {
        q = q.or(`visibilidade.neq.privado,id.in.(${allowedPrivadoIds.join(",")})`);
      } else {
        q = q.neq("visibilidade", "privado");
      }

      if (busca.trim()) {
        q = q.ilike("nome", `%${busca.trim()}%`);
      }
      if (categoria) {
        q = q.eq("categoria", categoria);
      }

      const { data: clubes, error } = await q;
      if (error) throw error;
      const list: any[] = clubes ?? [];
      if (!list.length) return [];

      const ids = list.map((c: any) => c.id);

      // Métricas computadas em tempo real
      const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [membrosRes, posts7Res, posts30Res, metricasRes] = await Promise.all([
        supabase.from("clube_membros").select("clube_id, user_id").in("clube_id", ids).eq("status", "ativo"),
        supabase.from("clube_posts").select("clube_id, user_id").in("clube_id", ids).gte("created_at", since7),
        supabase.from("clube_posts").select("clube_id, user_id").in("clube_id", ids).gte("created_at", since30),
        supabase.from("clube_metricas").select("clube_id, profundidade_score").in("clube_id", ids),
      ]);
      const membrosCount = new Map<string, number>();
      const membros30 = new Map<string, Set<string>>();
      (membrosRes.data ?? []).forEach((m: any) => {
        membrosCount.set(m.clube_id, (membrosCount.get(m.clube_id) ?? 0) + 1);
      });
      const ativos7Map = new Map<string, Set<string>>();
      const ativos30Map = new Map<string, Set<string>>();
      (posts7Res.data ?? []).forEach((p: any) => {
        if (!ativos7Map.has(p.clube_id)) ativos7Map.set(p.clube_id, new Set());
        ativos7Map.get(p.clube_id)!.add(p.user_id);
      });
      (posts30Res.data ?? []).forEach((p: any) => {
        if (!ativos30Map.has(p.clube_id)) ativos30Map.set(p.clube_id, new Set());
        ativos30Map.get(p.clube_id)!.add(p.user_id);
      });
      const profundidadeMap = new Map((metricasRes.data ?? []).map((m: any) => [m.clube_id, Number(m.profundidade_score ?? 0)]));

      // Tags
      const { data: clubeTags } = await supabase
        .from("clube_tags")
        .select("clube_id, tags(nome)")
        .in("clube_id", ids);
      const tagsMap = new Map<string, string[]>();
      (clubeTags ?? []).forEach((ct: any) => {
        const arr = tagsMap.get(ct.clube_id) ?? [];
        if (ct.tags?.nome) arr.push(ct.tags.nome);
        tagsMap.set(ct.clube_id, arr);
      });

      // Curadores
      const curadorIds = Array.from(new Set(list.map((c: any) => c.curador_id).filter(Boolean)));
      const { data: perfis } = await supabase
        .from("perfis")
        .select("user_id, username, nome_exibicao, avatar_url")
        .in("user_id", curadorIds);
      const perfisMap = new Map((perfis ?? []).map((p: any) => [p.user_id, p]));

      let enriched: ClubeCardData[] = list.map((c: any) => {
        const total = membrosCount.get(c.id) ?? 0;
        const ativos7 = ativos7Map.get(c.id)?.size ?? 0;
        const ativos30 = ativos30Map.get(c.id)?.size ?? 0;
        const engagement = total > 0 ? Math.round((ativos7 / total) * 100) : 0;
        return {
          ...c,
          membros_count: total,
          ativos_7d: ativos7,
          engagement_score: engagement,
          profundidade_score: profundidadeMap.get(c.id) ?? 0,
          tags: tagsMap.get(c.id) ?? [],
          curador: perfisMap.get(c.curador_id) ?? null,
          is_membro: membroIds.has(c.id),
        };
      });

      // Filtro por categoria já aplicado na query (coluna `categoria`)

      // Ordenação por seção
      switch (secao) {
        case "em_alta":
          enriched.sort((a, b) => b.engagement_score - a.engagement_score);
          break;
        case "novos":
          enriched.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
          break;
        case "mais_profundos":
          enriched.sort((a, b) => b.profundidade_score - a.profundidade_score);
          break;
        case "mais_ativos":
          enriched.sort((a, b) => b.ativos_7d - a.ativos_7d);
          break;
        case "pequenos":
          enriched = enriched.filter((c) => c.membros_count > 0 && c.membros_count <= 30);
          enriched.sort((a, b) => a.membros_count - b.membros_count);
          break;
        case "para_voce":
          enriched.sort((a, b) => b.engagement_score - a.engagement_score);
          break;
        default:
          enriched.sort((a, b) => b.membros_count - a.membros_count);
      }

      return enriched;
    },
  });
};

export const CATEGORIAS: { value: string; label: string }[] = [
  { value: "ficcao", label: "Ficção" },
  { value: "filosofia", label: "Filosofia" },
  { value: "negocios", label: "Negócios" },
  { value: "espiritualidade", label: "Espiritualidade" },
  { value: "fantasia", label: "Fantasia" },
  { value: "classico", label: "Clássicos" },
  { value: "desenvolvimento", label: "Desenvolvimento Pessoal" },
];
