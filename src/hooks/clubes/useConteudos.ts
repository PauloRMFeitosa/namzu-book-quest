import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ClubeConteudo {
  id: string;
  clube_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  url_conteudo: string;
  ordem_liberacao: number;
  liberado_apos_dias: number;
  created_at: string;
  acessos_count: number;
  acessado_por_mim: boolean;
}

export const useConteudos = (clubeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clube-conteudos", clubeId, user?.id],
    enabled: !!clubeId,
    queryFn: async (): Promise<ClubeConteudo[]> => {
      const { data: conteudos, error } = await supabase
        .from("clube_conteudos")
        .select("*")
        .eq("clube_id", clubeId!)
        .order("ordem_liberacao", { ascending: true });
      if (error) throw error;
      const ids = (conteudos ?? []).map((c) => c.id);
      if (!ids.length) return [];

      const { data: acessos } = await supabase
        .from("clube_conteudo_acessos")
        .select("conteudo_id, user_id")
        .in("conteudo_id", ids);

      const counts = new Map<string, number>();
      const meus = new Set<string>();
      (acessos ?? []).forEach((a: any) => {
        counts.set(a.conteudo_id, (counts.get(a.conteudo_id) ?? 0) + 1);
        if (user && a.user_id === user.id) meus.add(a.conteudo_id);
      });

      return (conteudos ?? []).map((c: any) => ({
        ...c,
        acessos_count: counts.get(c.id) ?? 0,
        acessado_por_mim: meus.has(c.id),
      }));
    },
  });
};

export const useCriarConteudo = (clubeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      descricao?: string;
      tipo: string;
      url_conteudo: string;
      ordem_liberacao: number;
      liberado_apos_dias?: number;
    }) => {
      const { error } = await supabase.from("clube_conteudos").insert({
        clube_id: clubeId,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conteúdo publicado");
      qc.invalidateQueries({ queryKey: ["clube-conteudos", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao publicar"),
  });
};

export const useRegistrarAcesso = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conteudoId: string) => {
      if (!user) return;
      await supabase
        .from("clube_conteudo_acessos")
        .insert({ conteudo_id: conteudoId, user_id: user.id });
    },
    onSuccess: (_d, conteudoId) => {
      qc.invalidateQueries({ queryKey: ["clube-conteudos"] });
    },
  });
};
