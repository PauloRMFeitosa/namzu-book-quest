import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import { registrarEvento } from "@/services/analytics";
import type { AvisoDoClube } from "@/lib/avisos";

// Avisos do organizador para o clube (Fase 3). Quem faz parte do clube lê; só
// o organizador e admins enviam e apagam.

/** Os avisos mais recentes do clube, do mais novo para o mais antigo. */
export const useAvisosClube = (clubeId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.avisos(clubeId ?? ""),
    enabled: !!clubeId && habilitado,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<AvisoDoClube[]> => {
      const { data, error } = await supabase
        .from("clube_avisos")
        .select("id, clube_id, titulo, mensagem, created_at")
        .eq("clube_id", clubeId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AvisoDoClube[];
    },
  });

export const useEnviarAviso = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { titulo: string; mensagem: string }) => {
      const { error } = await supabase.rpc("clube_enviar_aviso", {
        p_clube_id: clubeId,
        p_titulo: input.titulo.trim(),
        p_mensagem: input.mensagem.trim(),
      });
      if (error) throw error;
      registrarEvento("aviso_enviado", { clubeId });
    },
    onSuccess: () => {
      toast.success("Aviso enviado. Os membros foram avisados no app.");
      if (clubeId) qc.invalidateQueries({ queryKey: queryKeys.clubes.avisos(clubeId), refetchType: "all" });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível enviar o aviso"),
  });
};

export const useApagarAviso = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (avisoId: string) => {
      const { data, error } = await supabase.from("clube_avisos").delete().eq("id", avisoId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Você não tem permissão para esta ação.");
    },
    onSuccess: () => {
      toast.success("Aviso apagado");
      if (clubeId) qc.invalidateQueries({ queryKey: queryKeys.clubes.avisos(clubeId), refetchType: "all" });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível apagar o aviso"),
  });
};
