import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import { registrarEvento } from "@/services/analytics";
import type { MetaLeitura, MetaRascunho } from "@/lib/cronograma";

// Cronograma de leitura do clube (Fase 3): metas com data para cada livro da
// trilha. Membro ativo lê; só o organizador e admins gravam.

// TEMPORÁRIO: a tabela `clube_metas_leitura` e a função `clube_salvar_cronograma`
// ainda não estão em `types.ts`. Trocar por `supabase` depois de aplicar a
// migração `fase3_cronograma_leitura` e regenerar os tipos.
const semTipos = supabase as any;

/** Todas as metas do clube, da mais próxima para a mais distante. */
export const useMetasClube = (clubeId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.metas(clubeId ?? ""),
    enabled: !!clubeId && habilitado,
    // A meta da semana muda com o calendário: vale buscar de novo ao abrir.
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<MetaLeitura[]> => {
      const { data, error } = await semTipos
        .from("clube_metas_leitura")
        .select("id, trilha_id, clube_id, titulo, percentual_alvo, data_limite")
        .eq("clube_id", clubeId!)
        .order("data_limite", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MetaLeitura[];
    },
  });

/**
 * Total de páginas de cada obra, para traduzir o alvo da meta em página. Uma
 * obra pode ter várias edições; vale sempre a mesma (a de menor id com páginas
 * informadas), para organizador e membros verem o mesmo número.
 */
export const usePaginasDasObras = (obraIds: string[]) => {
  const ids = [...new Set(obraIds.filter(Boolean))].sort();
  return useQuery({
    queryKey: queryKeys.clubes.paginasDasObras(ids),
    enabled: ids.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("edicoes")
        .select("id, obra_id, num_paginas")
        .in("obra_id", ids)
        .not("num_paginas", "is", null)
        .order("id", { ascending: true });
      if (error) throw error;
      const paginas: Record<string, number> = {};
      for (const e of data ?? []) {
        if (e.obra_id && e.num_paginas && !(e.obra_id in paginas)) paginas[e.obra_id] = e.num_paginas;
      }
      return paginas;
    },
  });
};

export interface SalvarCronogramaInput {
  trilhaId: string;
  /** "AAAA-MM-DD" ou vazio. */
  inicio: string;
  fim: string;
  metas: MetaRascunho[];
  /** Como as metas foram montadas, para medir o uso do atalho de semanas. */
  origem: "semanas" | "manual";
}

export const useSalvarCronograma = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalvarCronogramaInput) => {
      const { error } = await semTipos.rpc("clube_salvar_cronograma", {
        p_trilha_id: input.trilhaId,
        p_data_inicio: input.inicio || null,
        p_data_fim: input.fim || null,
        p_metas: input.metas.map((m) => ({
          ...(m.id ? { id: m.id } : {}),
          titulo: m.titulo.trim(),
          percentual_alvo: m.percentual_alvo,
          data_limite: m.data_limite,
        })),
      });
      if (error) throw error;
      registrarEvento("cronograma_definido", {
        clubeId,
        props: { metas: input.metas.length, origem: input.origem },
      });
    },
    onSuccess: () => {
      toast.success("Cronograma salvo");
      if (!clubeId) return;
      qc.invalidateQueries({ queryKey: queryKeys.clubes.metas(clubeId), refetchType: "all" });
      qc.invalidateQueries({ queryKey: queryKeys.clubes.visaoGeral(clubeId), refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["clube-trilhas-gestao", clubeId], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId], refetchType: "all" });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível salvar o cronograma"),
  });
};
