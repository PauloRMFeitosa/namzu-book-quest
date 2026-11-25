import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import { registrarEvento } from "@/services/analytics";
import type { RespostaAoEncontro } from "@/lib/encontros";

// Lista de presença e ata dos encontros (Fase 3). Quem faz parte do clube lê;
// só o organizador e admins gravam.

// TEMPORÁRIO: `evento_presencas`, `evento_atas` e as funções de salvar ainda não
// estão em `types.ts`. Trocar por `supabase` depois de aplicar a migração
// `fase3_encontros` e regenerar os tipos.
export const semTiposDeEncontro = supabase as any;

export interface AtaDoEncontro {
  evento_id: string;
  texto: string;
  atualizado_em: string;
}

/** Quem o organizador marcou como presente. */
export const usePresencasEvento = (eventoId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.eventos.presencas(eventoId ?? ""),
    enabled: !!eventoId && habilitado,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await semTiposDeEncontro
        .from("evento_presencas")
        .select("user_id")
        .eq("evento_id", eventoId!);
      if (error) throw error;
      return (data ?? []).map((p: { user_id: string }) => p.user_id);
    },
  });

/** Resposta de cada pessoa ao encontro (vou, talvez, não). */
export const useRespostasEvento = (eventoId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.eventos.respostas(eventoId ?? ""),
    enabled: !!eventoId && habilitado,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async (): Promise<Record<string, RespostaAoEncontro>> => {
      const { data, error } = await supabase
        .from("evento_participantes")
        .select("user_id, status")
        .eq("evento_id", eventoId!);
      if (error) throw error;
      const respostas: Record<string, RespostaAoEncontro> = {};
      for (const r of data ?? []) {
        if (r.status === "confirmado" || r.status === "talvez" || r.status === "recusado") {
          respostas[r.user_id] = r.status;
        }
      }
      return respostas;
    },
  });

export const useSalvarPresenca = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { eventoId: string; presentes: string[]; membros: number }) => {
      const { error } = await semTiposDeEncontro.rpc("evento_salvar_presenca", {
        p_evento_id: input.eventoId,
        p_presentes: input.presentes,
      });
      if (error) throw error;
      registrarEvento("presenca_registrada", {
        clubeId,
        props: { presentes: input.presentes.length, membros: input.membros },
      });
    },
    onSuccess: (_r, input) => {
      toast.success("Lista de presença salva");
      qc.invalidateQueries({ queryKey: queryKeys.eventos.presencas(input.eventoId), refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["clube-eventos", clubeId], refetchType: "all" });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível salvar a presença"),
  });
};

export const useAtaEvento = (eventoId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.eventos.ata(eventoId ?? ""),
    enabled: !!eventoId && habilitado,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async (): Promise<AtaDoEncontro | null> => {
      const { data, error } = await semTiposDeEncontro
        .from("evento_atas")
        .select("evento_id, texto, atualizado_em")
        .eq("evento_id", eventoId!)
        .maybeSingle();
      if (error) throw error;
      return (data as AtaDoEncontro | null) ?? null;
    },
  });

export const useSalvarAta = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { eventoId: string; texto: string }) => {
      const { data, error } = await semTiposDeEncontro.rpc("evento_salvar_ata", {
        p_evento_id: input.eventoId,
        p_texto: input.texto,
      });
      if (error) throw error;
      const ficouGravada = data === true;
      registrarEvento("ata_salva", { clubeId, props: { apagada: !ficouGravada } });
      return ficouGravada;
    },
    onSuccess: (ficouGravada, input) => {
      toast.success(ficouGravada ? "Ata salva" : "Ata apagada");
      qc.invalidateQueries({ queryKey: queryKeys.eventos.ata(input.eventoId), refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["clube-eventos", clubeId], refetchType: "all" });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível salvar a ata"),
  });
};
