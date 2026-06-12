import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ---------- Estado: o usuário atual está seguindo `seguidoId`? ----------
export function useIsSeguindo(seguidoId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-seguindo", user?.id, seguidoId],
    enabled: !!user && !!seguidoId && user.id !== seguidoId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_seguindo", {
        p_seguido_id: seguidoId!,
      });
      return !!data;
    },
  });
}

// ---------- Contadores de seguidores / seguindo ----------
export function useContagemSocial(userId: string | undefined) {
  return useQuery({
    queryKey: ["contagem-social", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ count: seguidores }, { count: seguindo }] = await Promise.all([
        supabase
          .from("conexoes")
          .select("*", { count: "exact", head: true })
          .eq("seguido_id", userId!)
          .eq("status", "ativo"),
        supabase
          .from("conexoes")
          .select("*", { count: "exact", head: true })
          .eq("seguidor_id", userId!)
          .eq("status", "ativo"),
      ]);
      return { seguidores: seguidores ?? 0, seguindo: seguindo ?? 0 };
    },
  });
}

// ---------- Ações: seguir / desseguir ----------
export function useSeguirMutation(seguidoId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["is-seguindo", user?.id, seguidoId] });
    qc.invalidateQueries({ queryKey: ["contagem-social", seguidoId] });
    qc.invalidateQueries({ queryKey: ["seguidores", seguidoId] });
    qc.invalidateQueries({ queryKey: ["seguindo", user?.id] });
  };

  const seguir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("seguir_usuario", {
        p_seguido_id: seguidoId,
      });
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["is-seguindo", user?.id, seguidoId] });
      const prev = qc.getQueryData<boolean>(["is-seguindo", user?.id, seguidoId]);
      qc.setQueryData(["is-seguindo", user?.id, seguidoId], true);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["is-seguindo", user?.id, seguidoId], ctx?.prev ?? false);
    },
    onSettled: invalidate,
  });

  const desseguir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("desseguir_usuario", {
        p_seguido_id: seguidoId,
      });
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["is-seguindo", user?.id, seguidoId] });
      const prev = qc.getQueryData<boolean>(["is-seguindo", user?.id, seguidoId]);
      qc.setQueryData(["is-seguindo", user?.id, seguidoId], false);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["is-seguindo", user?.id, seguidoId], ctx?.prev ?? true);
    },
    onSettled: invalidate,
  });

  return { seguir, desseguir };
}
