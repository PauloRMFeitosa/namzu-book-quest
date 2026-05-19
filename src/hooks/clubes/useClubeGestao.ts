import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

export const useIsCurador = (clubeId: string | undefined, curadorId: string | undefined) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const isCurador = !!user && !!curadorId && user.id === curadorId;
  return { isCurador, canManage: isCurador || isAdmin };
};

export const useGestaoStats = (clubeId: string | undefined) => {
  return useQuery({
    queryKey: ["clube-gestao-stats", clubeId],
    enabled: !!clubeId,
    queryFn: async () => {
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const nowIso = new Date().toISOString();

      const [membros, posts, posts7d, eventosFut, conteudos] = await Promise.all([
        supabase.from("clube_membros").select("user_id", { count: "exact", head: true }).eq("clube_id", clubeId!),
        supabase.from("clube_posts").select("id", { count: "exact", head: true }).eq("clube_id", clubeId!),
        supabase
          .from("clube_posts")
          .select("id", { count: "exact", head: true })
          .eq("clube_id", clubeId!)
          .gte("created_at", since7d),
        supabase
          .from("eventos")
          .select("id", { count: "exact", head: true })
          .eq("clube_id", clubeId!)
          .gte("inicio_em", nowIso),
        supabase.from("clube_conteudos").select("id", { count: "exact", head: true }).eq("clube_id", clubeId!),
      ]);

      const { data: novosMembros } = await supabase
        .from("clube_membros")
        .select("user_id")
        .eq("clube_id", clubeId!)
        .gte("data_entrada", since30d);

      return {
        membros: membros.count ?? 0,
        posts: posts.count ?? 0,
        posts7d: posts7d.count ?? 0,
        eventosFuturos: eventosFut.count ?? 0,
        conteudos: conteudos.count ?? 0,
        novos30d: novosMembros?.length ?? 0,
      };
    },
  });
};

export const useTopContribuidores = (clubeId: string | undefined) => {
  return useQuery({
    queryKey: ["clube-top-contribuidores", clubeId],
    enabled: !!clubeId,
    queryFn: async () => {
      const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data: posts } = await supabase
        .from("clube_posts")
        .select("user_id")
        .eq("clube_id", clubeId!)
        .gte("created_at", since30d);

      const counts = new Map<string, number>();
      (posts ?? []).forEach((p: any) => counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1));
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) return [];

      const ids = top.map(([id]) => id);
      const { data: perfis } = await supabase
        .from("perfis")
        .select("user_id, nome_exibicao, username, avatar_url")
        .in("user_id", ids);
      const map = new Map((perfis ?? []).map((p: any) => [p.user_id, p]));
      return top.map(([uid, qtd]) => ({ user_id: uid, qtd, perfil: map.get(uid) }));
    },
  });
};

export const useAtualizarClube = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      nome?: string;
      descricao?: string | null;
      objetivo?: string | null;
      regras?: string | null;
      imagem_capa_url?: string | null;
      is_ativo?: boolean;
      categoria?: string | null;
      visibilidade?: string | null;
    }) => {
      const { error } = await (supabase as any).from("clubes").update(patch).eq("id", clubeId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clube atualizado");
      qc.invalidateQueries({ queryKey: ["clube", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};

export const useRemoverMembro = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("clube_membros")
        .delete()
        .eq("clube_id", clubeId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: ["clube-membros", clubeId] });
      qc.invalidateQueries({ queryKey: ["clube-gestao-stats", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
};
