import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ClubeDetalhe {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_capa_url: string | null;
  curador_id: string;
  is_ativo: boolean;
  duracao_tipo: string;
  objetivo: string | null;
  regras: string | null;
  categoria: string | null;
  created_at: string;
  curador?: {
    user_id: string;
    username: string | null;
    nome_exibicao: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  membros_count: number;
  ativos_7d: number;
  ativos_30d: number;
  engagement_score: number;
  tags: string[];
}

export const useClube = (id: string | undefined) => {
  return useQuery({
    queryKey: ["clube", id],
    enabled: !!id,
    queryFn: async (): Promise<ClubeDetalhe | null> => {
      const { data: c, error } = await supabase
        .from("clubes")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!c) return null;

      const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

      const [perfilRes, membrosRes, posts7Res, posts30Res, tagsRes] = await Promise.all([
        supabase
          .from("perfis")
          .select("user_id, username, nome_exibicao, avatar_url, bio")
          .eq("user_id", c.curador_id)
          .maybeSingle(),
        supabase
          .from("clube_membros")
          .select("user_id", { count: "exact" })
          .eq("clube_id", c.id)
          .eq("status", "ativo"),
        supabase
          .from("clube_posts")
          .select("user_id")
          .eq("clube_id", c.id)
          .gte("created_at", since7),
        supabase
          .from("clube_posts")
          .select("user_id")
          .eq("clube_id", c.id)
          .gte("created_at", since30),
        supabase
          .from("clube_tags")
          .select("tags(nome)")
          .eq("clube_id", c.id),
      ]);

      const membrosCount = membrosRes.count ?? (membrosRes.data?.length ?? 0);
      const ativos7d = new Set((posts7Res.data ?? []).map((p: any) => p.user_id)).size;
      const ativos30d = new Set((posts30Res.data ?? []).map((p: any) => p.user_id)).size;
      const engagement = membrosCount > 0
        ? Math.round((ativos7d / membrosCount) * 100)
        : 0;

      return {
        ...(c as any),
        categoria: (c as any).categoria ?? null,
        curador: perfilRes.data ?? null,
        membros_count: membrosCount,
        ativos_7d: ativos7d,
        ativos_30d: ativos30d,
        engagement_score: engagement,
        tags: (tagsRes.data ?? []).map((r: any) => r.tags?.nome).filter(Boolean),
      } as ClubeDetalhe;
    },
  });
};

export const useClubeMembership = (clubeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clube-membership", clubeId, user?.id],
    enabled: !!clubeId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("clube_membros")
        .select("clube_id, status, data_entrada")
        .eq("clube_id", clubeId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      // Se o usuário já está ativo, garante que os livros da trilha estejam
      // sincronizados na biblioteca dele (executa sob o próprio auth — passa RLS).
      if (data?.status === "ativo" && user && clubeId) {
        try { await sincronizarLivrosClube(user.id, clubeId); } catch (e) { console.warn("sync livros (membership) falhou", e); }
      }
      return data;
    },
  });
};

async function sincronizarLivrosClube(userId: string, clubeId: string) {
  const { data: trilhas } = await supabase
    .from("clube_trilhas")
    .select("obra_id")
    .eq("clube_id", clubeId);
  const obraIds = Array.from(new Set((trilhas ?? []).map((t: any) => t.obra_id)));
  if (!obraIds.length) return;

  const { data: existentes } = await supabase
    .from("usuario_livros")
    .select("id, obra_id, status")
    .eq("user_id", userId)
    .in("obra_id", obraIds);
  const byObra = new Map<string, { id: string; status: string }>(
    (existentes ?? []).map((r: any) => [r.obra_id, { id: r.id, status: r.status }])
  );

  const today = new Date().toISOString().slice(0, 10);
  for (const obra_id of obraIds) {
    let usuarioLivroId: string | undefined;
    const ex = byObra.get(obra_id);
    if (!ex) {
      const { data: novo } = await supabase
        .from("usuario_livros")
        .insert({ user_id: userId, obra_id, status: "quero_ler" })
        .select("id")
        .single();
      usuarioLivroId = novo?.id;
    } else {
      usuarioLivroId = ex.id;
      if (ex.status === "lido" || ex.status === "concluido") {
        await supabase
          .from("usuario_livros")
          .update({ status: "relendo", updated_at: new Date().toISOString() })
          .eq("id", ex.id);
      }
    }
    if (!usuarioLivroId) continue;

    const { data: jaExiste } = await supabase
      .from("usuario_leituras")
      .select("id")
      .eq("usuario_livro_id", usuarioLivroId)
      .eq("clube_id", clubeId)
      .maybeSingle();
    if (!jaExiste) {
      await supabase.from("usuario_leituras").insert({
        usuario_livro_id: usuarioLivroId,
        tipo_origem: "clube",
        clube_id: clubeId,
        status: "lendo",
        data_inicio: today,
      });
    }
  }
}

export const useEntrarClube = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user || !clubeId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("clube_membros")
        .insert({ clube_id: clubeId, user_id: user.id, status: "pendente" } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Aguarde aprovação do curador.");
      qc.invalidateQueries({ queryKey: ["clube-membership", clubeId] });
      qc.invalidateQueries({ queryKey: ["clube-membros-list", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao solicitar entrada"),
  });
};

export const useAprovarMembro = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!clubeId) throw new Error("Clube inválido");
      const { error } = await supabase
        .from("clube_membros")
        .update({ status: "ativo" })
        .eq("clube_id", clubeId)
        .eq("user_id", userId);
      if (error) throw error;
      // Sincroniza livros somente após aprovação
      try { await sincronizarLivrosClube(userId, clubeId); } catch (e) { console.warn("sync livros falhou", e); }
    },
    onSuccess: () => {
      toast.success("Membro aprovado");
      qc.invalidateQueries({ queryKey: ["clube-membros-list", clubeId] });
      qc.invalidateQueries({ queryKey: ["clube-membership", clubeId] });
      qc.invalidateQueries({ queryKey: ["clube", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao aprovar"),
  });
};

export const useRejeitarMembro = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!clubeId) throw new Error("Clube inválido");
      const { error } = await supabase
        .from("clube_membros")
        .delete()
        .eq("clube_id", clubeId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      qc.invalidateQueries({ queryKey: ["clube-membros-list", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao rejeitar"),
  });
};

export const useDefinirPapelMembro = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, papel }: { userId: string; papel: "membro" | "moderador" }) => {
      if (!clubeId) throw new Error("Clube inválido");
      const { error } = await supabase
        .from("clube_membros")
        .update({ papel } as any)
        .eq("clube_id", clubeId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["clube-membros-list", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao alterar papel"),
  });
};

export const useSairClube = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user || !clubeId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("clube_membros")
        .delete()
        .eq("clube_id", clubeId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você saiu do clube");
      qc.invalidateQueries({ queryKey: ["clube-membership", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao sair"),
  });
};

export const useRankingClube = (clubeId: string | undefined) => {
  return useQuery({
    queryKey: ["clube-ranking", clubeId],
    enabled: !!clubeId,
    queryFn: async () => {
      // membros do clube
      const { data: membros } = await supabase
        .from("clube_membros")
        .select("user_id")
        .eq("clube_id", clubeId!)
        .limit(100);
      const ids = (membros ?? []).map((m: any) => m.user_id);
      if (!ids.length) return [];

      const [perfis, gam] = await Promise.all([
        supabase.from("perfis").select("user_id, nome_exibicao, username, avatar_url").in("user_id", ids),
        supabase.from("gamificacao_perfis").select("user_id, xp_total, nivel").in("user_id", ids),
      ]);
      const perfisMap = new Map((perfis.data ?? []).map((p: any) => [p.user_id, p]));
      const gamMap = new Map((gam.data ?? []).map((g: any) => [g.user_id, g]));

      return ids
        .map((uid) => ({
          user_id: uid,
          perfil: perfisMap.get(uid),
          xp: (gamMap.get(uid) as any)?.xp_total ?? 0,
          nivel: (gamMap.get(uid) as any)?.nivel ?? 1,
        }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 5);
    },
  });
};

export const useProximosEventos = (clubeId: string | undefined) => {
  return useQuery({
    queryKey: ["clube-proximos-eventos", clubeId],
    enabled: !!clubeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("id, titulo, tipo, inicio_em")
        .eq("clube_id", clubeId!)
        .gte("inicio_em", new Date().toISOString())
        .order("inicio_em", { ascending: true })
        .limit(3);
      return data ?? [];
    },
  });
};
