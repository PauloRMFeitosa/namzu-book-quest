import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface FeedPost {
  id: string;
  clube_id: string;
  user_id: string;
  conteudo: string;
  obra_id: string | null;
  parent_post_id: string | null;
  is_destaque_curador: boolean;
  curtidas_count: number;
  created_at: string;
  imagem_url: string | null;
  autor: {
    user_id: string;
    username: string | null;
    nome_exibicao: string | null;
    avatar_url: string | null;
  } | null;
  curtido_por_mim: boolean;
  respostas_count: number;
}

export const useRespostasPost = (postId: string | undefined, enabled: boolean) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clube-post-respostas", postId, user?.id],
    enabled: !!postId && enabled,
    queryFn: async (): Promise<FeedPost[]> => {
      const { data: posts, error } = await supabase
        .from("clube_posts")
        .select("*")
        .eq("parent_post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!posts || posts.length === 0) return [];
      const userIds = Array.from(new Set(posts.map((p: any) => p.user_id)));
      const postIds = posts.map((p: any) => p.id);
      const [perfisRes, curtidasMinhasRes] = await Promise.all([
        supabase
          .from("perfis")
          .select("user_id, username, nome_exibicao, avatar_url")
          .in("user_id", userIds),
        user
          ? supabase
              .from("clube_post_curtidas")
              .select("post_id")
              .in("post_id", postIds)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const perfisMap = new Map((perfisRes.data ?? []).map((p: any) => [p.user_id, p]));
      const curtidasSet = new Set(((curtidasMinhasRes as any).data ?? []).map((c: any) => c.post_id));
      return posts.map((p: any) => ({
        ...p,
        autor: perfisMap.get(p.user_id) ?? null,
        curtido_por_mim: curtidasSet.has(p.id),
        respostas_count: 0,
      })) as FeedPost[];
    },
  });
};

const PAGE_SIZE = 10;

export const useFeedClube = (clubeId: string | undefined) => {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ["clube-feed", clubeId, user?.id],
    enabled: !!clubeId,
    initialPageParam: 0 as number,
    getNextPageParam: (last: FeedPost[], all) =>
      last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE,
    queryFn: async ({ pageParam = 0 }): Promise<FeedPost[]> => {
      const from = pageParam as number;
      const to = from + PAGE_SIZE - 1;

      const { data: posts, error } = await supabase
        .from("clube_posts")
        .select("*")
        .eq("clube_id", clubeId!)
        .is("parent_post_id", null)
        .order("is_destaque_curador", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
      const postIds = posts.map((p) => p.id);

      const [perfisRes, curtidasMinhasRes, respostasRes] = await Promise.all([
        supabase
          .from("perfis")
          .select("user_id, username, nome_exibicao, avatar_url")
          .in("user_id", userIds),
        user
          ? supabase
              .from("clube_post_curtidas")
              .select("post_id")
              .in("post_id", postIds)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("clube_posts")
          .select("parent_post_id")
          .in("parent_post_id", postIds),
      ]);

      const perfisMap = new Map((perfisRes.data ?? []).map((p: any) => [p.user_id, p]));
      const curtidasSet = new Set(
        ((curtidasMinhasRes as any).data ?? []).map((c: any) => c.post_id),
      );
      const respostasMap = new Map<string, number>();
      ((respostasRes as any).data ?? []).forEach((r: any) => {
        respostasMap.set(r.parent_post_id, (respostasMap.get(r.parent_post_id) ?? 0) + 1);
      });

      return posts.map((p: any) => ({
        ...p,
        autor: perfisMap.get(p.user_id) ?? null,
        curtido_por_mim: curtidasSet.has(p.id),
        respostas_count: respostasMap.get(p.id) ?? 0,
      })) as FeedPost[];
    },
  });
};

export const useCriarPost = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      conteudo: string;
      parent_post_id?: string | null;
      imagem_url?: string | null;
    }) => {
      if (!user || !clubeId) throw new Error("Não autenticado");
      const conteudo = input.conteudo.trim();
      if (!conteudo && !input.imagem_url) throw new Error("Escreva algo ou adicione uma imagem");
      const { error } = await supabase.from("clube_posts").insert({
        clube_id: clubeId,
        user_id: user.id,
        conteudo: conteudo || "",
        parent_post_id: input.parent_post_id ?? null,
        imagem_url: input.imagem_url ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.parent_post_id ? "Comentário enviado" : "Publicado");
      qc.invalidateQueries({ queryKey: ["clube-feed", clubeId] });
      if (vars.parent_post_id) {
        qc.invalidateQueries({ queryKey: ["clube-post-respostas", vars.parent_post_id] });
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao publicar"),
  });
};

export const useCurtirPost = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; curtido: boolean }) => {
      if (!user) throw new Error("Não autenticado");
      if (input.curtido) {
        const { error } = await supabase
          .from("clube_post_curtidas")
          .delete()
          .eq("post_id", input.postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clube_post_curtidas")
          .insert({ post_id: input.postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, curtido }) => {
      await qc.cancelQueries({ queryKey: ["clube-feed", clubeId] });
      const prev = qc.getQueriesData({ queryKey: ["clube-feed", clubeId] });
      qc.setQueriesData({ queryKey: ["clube-feed", clubeId] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: FeedPost[]) =>
            page.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    curtido_por_mim: !curtido,
                    curtidas_count: Math.max(0, p.curtidas_count + (curtido ? -1 : 1)),
                  }
                : p,
            ),
          ),
        };
      });
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]: any) => qc.setQueryData(key, data));
      toast.error(e.message ?? "Erro");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["clube-feed", clubeId] });
    },
  });
};
