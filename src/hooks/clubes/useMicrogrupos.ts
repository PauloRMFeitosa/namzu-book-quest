import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Microgrupo {
  id: string;
  clube_id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  limite_membros: number | null;
  privado: boolean | null;
  criado_por: string | null;
  created_at: string;
  membros_count: number;
  is_membro: boolean;
}

export const useMicrogrupos = (clubeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["microgrupos", clubeId, user?.id],
    enabled: !!clubeId,
    queryFn: async (): Promise<Microgrupo[]> => {
      const { data: grupos, error } = await supabase
        .from("microgrupos")
        .select("*")
        .eq("clube_id", clubeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!grupos?.length) return [];

      const ids = grupos.map((g: any) => g.id);
      const { data: membros } = await supabase
        .from("microgrupo_membros")
        .select("microgrupo_id, user_id")
        .in("microgrupo_id", ids);

      const counts = new Map<string, number>();
      const meus = new Set<string>();
      (membros ?? []).forEach((m: any) => {
        counts.set(m.microgrupo_id, (counts.get(m.microgrupo_id) ?? 0) + 1);
        if (user && m.user_id === user.id) meus.add(m.microgrupo_id);
      });

      return grupos.map((g: any) => ({
        ...g,
        membros_count: counts.get(g.id) ?? 0,
        is_membro: meus.has(g.id),
      }));
    },
  });
};

export const useMicrogrupoMembros = (microgrupoId: string | undefined) => {
  return useQuery({
    queryKey: ["microgrupo-membros", microgrupoId],
    enabled: !!microgrupoId,
    queryFn: async () => {
      const { data: membros } = await supabase
        .from("microgrupo_membros")
        .select("user_id, papel, joined_at")
        .eq("microgrupo_id", microgrupoId!)
        .order("joined_at", { ascending: true });
      const ids = (membros ?? []).map((m: any) => m.user_id);
      if (!ids.length) return [];
      const { data: perfis } = await supabase
        .from("perfis")
        .select("user_id, nome_exibicao, username, avatar_url")
        .in("user_id", ids);
      const map = new Map((perfis ?? []).map((p: any) => [p.user_id, p]));
      return (membros ?? []).map((m: any) => ({ ...m, perfil: map.get(m.user_id) }));
    },
  });
};

export const useCriarMicrogrupo = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      descricao?: string;
      tipo?: string;
      limite_membros?: number;
      privado?: boolean;
    }) => {
      if (!user || !clubeId) throw new Error("Não autenticado");
      const { data: grupo, error } = await supabase
        .from("microgrupos")
        .insert({
          clube_id: clubeId,
          nome: input.nome,
          descricao: input.descricao ?? null,
          tipo: input.tipo ?? "fixo",
          limite_membros: input.limite_membros ?? 10,
          privado: input.privado ?? true,
          criado_por: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // criador entra automaticamente como líder
      await supabase.from("microgrupo_membros").insert({
        microgrupo_id: grupo.id,
        user_id: user.id,
        papel: "lider",
      });
      return grupo;
    },
    onSuccess: () => {
      toast.success("Microgrupo criado!");
      qc.invalidateQueries({ queryKey: ["microgrupos", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
  });
};

export const useEntrarMicrogrupo = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (microgrupoId: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("microgrupo_membros")
        .insert({ microgrupo_id: microgrupoId, user_id: user.id, papel: "membro" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você entrou no microgrupo!");
      qc.invalidateQueries({ queryKey: ["microgrupos", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao entrar"),
  });
};

export const useSairMicrogrupo = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (microgrupoId: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("microgrupo_membros")
        .delete()
        .eq("microgrupo_id", microgrupoId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você saiu do microgrupo");
      qc.invalidateQueries({ queryKey: ["microgrupos", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao sair"),
  });
};
