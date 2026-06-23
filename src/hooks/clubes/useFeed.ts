import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { temDicaPendente, dispensarDica } from "@/hooks/useDicaPrimeiraVez";

type ClubePostRow = Database["public"]["Tables"]["clube_posts"]["Row"];
type AutorPerfil = Pick<
  Database["public"]["Tables"]["perfis"]["Row"],
  "user_id" | "username" | "nome_exibicao" | "avatar_url"
>;
type CurtidaPost = Pick<Database["public"]["Tables"]["clube_post_curtidas"]["Row"], "post_id">;
type RespostaPost = Pick<Database["public"]["Tables"]["clube_posts"]["Row"], "parent_post_id">;
type FeedInfiniteData = InfiniteData<FeedPost[], number>;

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
  imagem_url?: string | null;
  autor: {
    user_id: string;
    username: string | null;
    nome_exibicao: string | null;
    avatar_url: string | null;
  } | null;
  curtido_por_mim: boolean;
  respostas_count: number;
}

const countCurtidasByPost = (curtidas: Array<{ post_id: string }>) => {
  const counts = new Map<string, number>();
  curtidas.forEach((curtida) => {
    counts.set(curtida.post_id, (counts.get(curtida.post_id) ?? 0) + 1);
  });
  return counts;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const toFeedPost = (
  post: ClubePostRow & { imagem_url?: string | null },
  perfisMap: Map<string, AutorPerfil>,
  curtidasSet: Set<string>,
  curtidasMap: Map<string, number>,
  respostasCount: number,
): FeedPost => ({
  id: post.id,
  clube_id: post.clube_id,
  user_id: post.user_id,
  conteudo: post.conteudo,
  obra_id: post.obra_id,
  parent_post_id: post.parent_post_id,
  is_destaque_curador: post.is_destaque_curador ?? false,
  curtidas_count: curtidasMap.get(post.id) ?? post.curtidas_count ?? 0,
  created_at: post.created_at ?? new Date().toISOString(),
  imagem_url: (post as any).imagem_url ?? null,
  autor: perfisMap.get(post.user_id) ?? null,
  curtido_por_mim: curtidasSet.has(post.id),
  respostas_count: respostasCount,
});

const withUpdatedLike = (postId: string, curtido: boolean) => (post: FeedPost): FeedPost =>
  post.id === postId
    ? {
        ...post,
        curtido_por_mim: !curtido,
        curtidas_count: Math.max(0, post.curtidas_count + (curtido ? -1 : 1)),
      }
    : post;

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
      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
      const postIds = posts.map((p) => p.id);
      const [perfisRes, curtidasMinhasRes, curtidasRes] = await Promise.all([
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
          : Promise.resolve({ data: [] as CurtidaPost[] }),
        supabase
          .from("clube_post_curtidas")
          .select("post_id")
          .in("post_id", postIds),
      ]);
      const perfisMap = new Map<string, AutorPerfil>((perfisRes.data ?? []).map((p) => [p.user_id, p]));
      const curtidasSet = new Set((curtidasMinhasRes.data ?? []).map((c) => c.post_id));
      const curtidasMap = countCurtidasByPost(curtidasRes.data ?? []);
      return posts.map((p) => toFeedPost(p, perfisMap, curtidasSet, curtidasMap, 0));
    },
  });
};

const PAGE_SIZE = 10;

export const useFeedClube = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!clubeId) return;
    const channel = supabase
      .channel(`feed:${clubeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clube_posts", filter: `clube_id=eq.${clubeId}` },
        () => qc.invalidateQueries({ queryKey: ["clube-feed", clubeId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubeId, qc]);

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

      const [perfisRes, curtidasMinhasRes, curtidasRes, respostasRes] = await Promise.all([
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
          : Promise.resolve({ data: [] as CurtidaPost[] }),
        supabase
          .from("clube_post_curtidas")
          .select("post_id")
          .in("post_id", postIds),
        supabase
          .from("clube_posts")
          .select("parent_post_id")
          .in("parent_post_id", postIds),
      ]);

      const perfisMap = new Map<string, AutorPerfil>((perfisRes.data ?? []).map((p) => [p.user_id, p]));
      const curtidasSet = new Set(
        (curtidasMinhasRes.data ?? []).map((c) => c.post_id),
      );
      const curtidasMap = countCurtidasByPost(curtidasRes.data ?? []);
      const respostasMap = new Map<string, number>();
      ((respostasRes.data ?? []) as RespostaPost[]).forEach((r) => {
        if (!r.parent_post_id) return;
        respostasMap.set(r.parent_post_id, (respostasMap.get(r.parent_post_id) ?? 0) + 1);
      });

      return posts.map((p) =>
        toFeedPost(p, perfisMap, curtidasSet, curtidasMap, respostasMap.get(p.id) ?? 0),
      );
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
    onError: (e) => toast.error(getErrorMessage(e, "Erro ao publicar")),
  });
};

export const useExcluirPost = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("clube_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post excluído");
      qc.invalidateQueries({ queryKey: ["clube-feed", clubeId] });
      qc.invalidateQueries({ queryKey: ["clube-post-respostas"] });
    },
    onError: (e) => toast.error(getErrorMessage(e, "Erro ao excluir post")),
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
      await qc.cancelQueries({ queryKey: ["clube-post-respostas"] });
      const prev = qc.getQueriesData({ queryKey: ["clube-feed", clubeId] });
      const prevRespostas = qc.getQueriesData({ queryKey: ["clube-post-respostas"] });
      qc.setQueriesData<FeedInfiniteData>({ queryKey: ["clube-feed", clubeId] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: FeedPost[]) =>
            page.map(withUpdatedLike(postId, curtido)),
          ),
        };
      });
      qc.setQueriesData<FeedPost[]>({ queryKey: ["clube-post-respostas"] }, (old) =>
        old ? old.map(withUpdatedLike(postId, curtido)) : old,
      );
      return { prev, prevRespostas };
    },
    onSuccess: (_data, variables) => {
      // Dica de primeira curtida (só quando o usuário está curtindo, não descurtindo)
      if (!variables.curtido && temDicaPendente("primeira_curtida")) {
        dispensarDica("primeira_curtida");
        toast.info("💡 Responda um post para começar uma conversa com outros leitores!", {
          duration: 7000,
        });
      }
    },
    onError: (e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key as QueryKey, data));
      ctx?.prevRespostas?.forEach(([key, data]) => qc.setQueryData(key as QueryKey, data));
      toast.error(getErrorMessage(e, "Erro"));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["clube-feed", clubeId] });
      qc.invalidateQueries({ queryKey: ["clube-post-respostas"] });
    },
  });
};
