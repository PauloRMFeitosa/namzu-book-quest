import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface EventoClube {
  id: string;
  clube_id: string | null;
  criador_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  inicio_em: string;
  fim_em: string | null;
  url_evento: string | null;
  gravado: boolean | null;
  limite_participantes: number | null;
  participantes_count: number;
  meu_status: string | null;
}

export const useEventosClube = (clubeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clube-eventos", clubeId, user?.id],
    enabled: !!clubeId,
    queryFn: async (): Promise<EventoClube[]> => {
      const { data: eventos, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("clube_id", clubeId!)
        .order("inicio_em", { ascending: true });
      if (error) throw error;
      const ids = (eventos ?? []).map((e: any) => e.id);
      if (!ids.length) return [];

      const [partsRes, mineRes] = await Promise.all([
        supabase.from("evento_participantes").select("evento_id, status").in("evento_id", ids),
        user
          ? supabase
              .from("evento_participantes")
              .select("evento_id, status")
              .in("evento_id", ids)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const counts = new Map<string, number>();
      (partsRes.data ?? []).forEach((p: any) => {
        if (p.status === "confirmado") counts.set(p.evento_id, (counts.get(p.evento_id) ?? 0) + 1);
      });
      const mine = new Map<string, string>(
        ((mineRes as any).data ?? []).map((p: any) => [p.evento_id, p.status])
      );
      return (eventos ?? []).map((e: any) => ({
        ...e,
        participantes_count: counts.get(e.id) ?? 0,
        meu_status: mine.get(e.id) ?? null,
      }));
    },
  });
};

export const useCriarEvento = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      titulo: string;
      descricao?: string;
      tipo?: string;
      inicio_em: string;
      fim_em?: string | null;
      url_evento?: string | null;
      limite_participantes?: number | null;
    }) => {
      if (!user || !clubeId) throw new Error("Não autenticado");
      const { error } = await supabase.from("eventos").insert({
        clube_id: clubeId,
        criador_id: user.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento criado!");
      qc.invalidateQueries({ queryKey: ["clube-eventos", clubeId] });
      qc.invalidateQueries({ queryKey: ["clube-proximos-eventos", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar evento"),
  });
};

export const useRsvp = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventoId,
      status,
    }: {
      eventoId: string;
      status: "confirmado" | "talvez" | "recusado" | null;
    }) => {
      if (!user) throw new Error("Não autenticado");
      if (status === null) {
        const { error } = await supabase
          .from("evento_participantes")
          .delete()
          .eq("evento_id", eventoId)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("evento_participantes")
        .upsert(
          { evento_id: eventoId, user_id: user.id, status },
          { onConflict: "evento_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clube-eventos", clubeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro no RSVP"),
  });
};
