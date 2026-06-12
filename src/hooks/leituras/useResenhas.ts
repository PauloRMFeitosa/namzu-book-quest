import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Resenha = {
  id: string;
  user_id: string;
  obra_id: string;
  leitura_id: string | null;
  titulo: string | null;
  texto: string;
  nota: number | null;
  tem_spoiler: boolean;
  visibilidade: "privada" | "clube" | "publica";
  created_at: string;
  updated_at: string;
};

/** Busca a resenha do usuário logado para uma obra específica */
export const useMinhaResenha = (obraId: string | null | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minha-resenha", obraId, user?.id],
    enabled: !!obraId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("leitura_resenha")
        .select("*")
        .eq("obra_id", obraId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as Resenha | null;
    },
  });
};

type UpsertResenhaPayload = {
  obra_id: string;
  leitura_id?: string | null;
  texto: string;
  tem_spoiler?: boolean;
  visibilidade?: "privada" | "clube" | "publica";
};

/** Cria ou atualiza (upsert) a resenha do usuário para uma obra */
export const useUpsertResenha = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: UpsertResenhaPayload) => {
      const { error } = await supabase.from("leitura_resenha").upsert(
        { ...payload, user_id: user!.id },
        { onConflict: "user_id,obra_id" }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["minha-resenha", vars.obra_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao publicar resenha"),
  });
};

/** Remove a resenha do usuário para uma obra */
export const useExcluirResenha = (obraId: string | null | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resenhaId: string) => {
      const { error } = await supabase.from("leitura_resenha").delete().eq("id", resenhaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resenha removida");
      qc.invalidateQueries({ queryKey: ["minha-resenha", obraId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover resenha"),
  });
};
