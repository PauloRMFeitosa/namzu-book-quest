import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Canal {
  id: string;
  clube_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  ordem: number | null;
  privado: boolean | null;
  created_at: string | null;
}

export const useCanais = (clubeId: string | undefined) => {
  return useQuery({
    queryKey: ["clube-canais", clubeId],
    enabled: !!clubeId,
    queryFn: async (): Promise<Canal[]> => {
      const { data, error } = await supabase
        .from("clube_canais")
        .select("*")
        .eq("clube_id", clubeId!)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Canal[];
    },
  });
};

export const useCriarCanal = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string }) => {
      if (!clubeId) throw new Error("Sem clube");
      const { error } = await supabase.from("clube_canais").insert({
        clube_id: clubeId,
        nome: input.nome.trim(),
        descricao: input.descricao?.trim() || null,
        tipo: "texto",
        ordem: 0,
        privado: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Canal criado");
      qc.invalidateQueries({ queryKey: ["clube-canais", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar canal"),
  });
};

/** Retorna o thread "padrão" do canal, criando-o se não existir. */
export async function obterOuCriarThreadPadrao(canalId: string, userId: string): Promise<string> {
  const { data: existentes, error: e1 } = await supabase
    .from("clube_threads")
    .select("id, created_at")
    .eq("canal_id", canalId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (e1) throw e1;
  if (existentes && existentes.length) return existentes[0].id;

  const { data: novo, error: e2 } = await supabase
    .from("clube_threads")
    .insert({ canal_id: canalId, titulo: "Geral", criado_por: userId })
    .select("id")
    .single();
  if (e2) throw e2;
  return novo.id;
}

export const useThreadPadrao = (canalId: string | null | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["canal-thread-padrao", canalId, user?.id],
    enabled: !!canalId && !!user,
    queryFn: () => obterOuCriarThreadPadrao(canalId!, user!.id),
  });
};
