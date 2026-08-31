import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/constants/queryKeys";

export type MetaDiariaStatus = {
  tem_meta: boolean;
  tipo_meta?: "minutos" | "paginas";
  valor_meta?: number;
  lembrete_ativo?: boolean;
  lembrete_tipo?: "horario" | "turno";
  lembrete_horario?: string | null;
  lembrete_turno?: "manha" | "tarde" | "noite" | null;
  canal_inapp?: boolean;
  canal_email?: boolean;
  canal_push?: boolean;
  realizado_hoje?: number;
  cumprida_hoje?: boolean;
  percentual?: number;
  streak_atual?: number;
  streak_maximo?: number;
};

export type SalvarMetaInput = {
  tipo_meta: "minutos" | "paginas";
  valor_meta: number;
  lembrete_ativo: boolean;
  lembrete_tipo: "horario" | "turno";
  lembrete_horario?: string | null;
  lembrete_turno?: "manha" | "tarde" | "noite" | null;
  canal_inapp: boolean;
  canal_email: boolean;
  canal_push: boolean;
};

/** Status da meta diária do usuário: progresso de hoje + ofensiva (streak). */
export const useMetaDiaria = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.gamificacao.metaDiaria(user?.id ?? ""),
    enabled: !!user,
    queryFn: async (): Promise<MetaDiariaStatus> => {
      const { data, error } = await (supabase as any).rpc("get_meta_diaria_status", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return (data ?? { tem_meta: false }) as MetaDiariaStatus;
    },
  });
};

/** Cria/atualiza a configuração da meta diária. */
export const useSalvarMetaDiaria = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalvarMetaInput) => {
      const payload = {
        user_id: user!.id,
        tipo_meta: input.tipo_meta,
        valor_meta: input.valor_meta,
        lembrete_ativo: input.lembrete_ativo,
        lembrete_tipo: input.lembrete_tipo,
        lembrete_horario: input.lembrete_tipo === "horario" ? input.lembrete_horario ?? null : null,
        lembrete_turno: input.lembrete_tipo === "turno" ? input.lembrete_turno ?? null : null,
        canal_inapp: input.canal_inapp,
        canal_email: input.canal_email,
        canal_push: input.canal_push,
      };
      const { error } = await (supabase as any)
        .from("metas_diarias_leitura")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gamificacao.metaDiaria(user?.id ?? "") });
    },
  });
};

/** Registro rápido de leitura do dia (quick-log do hábito). */
export const useRegistrarLeituraRapida = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ minutos, paginas }: { minutos?: number; paginas?: number }) => {
      const { error } = await (supabase as any).rpc("registrar_leitura_rapida", {
        _minutos: minutos ?? null,
        _paginas: paginas ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gamificacao.metaDiaria(user?.id ?? "") });
      qc.invalidateQueries({ queryKey: ["sequencia-leitura", user?.id] });
    },
  });
};
