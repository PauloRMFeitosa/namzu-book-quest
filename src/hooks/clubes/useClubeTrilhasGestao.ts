import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { queryKeys } from "@/constants/queryKeys";
import { registrarEvento } from "@/services/analytics";
import type { MetaRascunho } from "@/lib/cronograma";

export interface TrilhaGestaoItem {
  id: string;
  clube_id: string;
  obra_id: string;
  ordem: number;
  data_inicio_sugerida: string | null;
  data_fim_sugerida: string | null;
  obra: {
    id: string;
    titulo_original: string;
    capa_padrao_url: string | null;
  } | null;
}

export const useTrilhasGestao = (clubeId: string | undefined) => {
  return useQuery({
    queryKey: ["clube-trilhas-gestao", clubeId],
    enabled: !!clubeId,
    queryFn: async (): Promise<TrilhaGestaoItem[]> => {
      const { data: trilhas, error } = await supabase
        .from("clube_trilhas")
        .select("id, clube_id, obra_id, ordem, data_inicio_sugerida, data_fim_sugerida")
        .eq("clube_id", clubeId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      if (!trilhas?.length) return [];

      const ids = trilhas.map((t) => t.obra_id);
      const { data: obras } = await supabase
        .from("obras")
        .select("id, titulo_original, capa_padrao_url")
        .in("id", ids);
      const map = new Map((obras ?? []).map((o: any) => [o.id, o]));
      return trilhas.map((t: any) => ({ ...t, obra: map.get(t.obra_id) ?? null }));
    },
  });
};

const invalidate = (qc: ReturnType<typeof useQueryClient>, clubeId?: string) => {
  // refetchType "all": a query da trilha (clube-leituras) fica inativa enquanto
  // o curador está na aba de gestão; com o refetch padrão ("active") ela só era
  // marcada como stale e, como o app usa refetchOnMount: false + cache persistido
  // no localStorage, a trilha nunca era rebuscada e o livro novo não aparecia.
  qc.invalidateQueries({ queryKey: ["clube-trilhas-gestao", clubeId], refetchType: "all" });
  qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId], refetchType: "all" });
};

/** Dados do livro escolhido, para o organizador conferir antes de incluir na trilha. */
export interface ObraParaTrilha {
  id: string;
  titulo_original: string;
  capa_padrao_url: string | null;
  ano_primeira_publicacao: number | null;
  sinopse_padrao: string | null;
  autores: string[];
}

export const useObraParaTrilha = (obraId: string | null) =>
  useQuery({
    queryKey: queryKeys.clubes.obraParaTrilha(obraId ?? ""),
    enabled: !!obraId,
    queryFn: async (): Promise<ObraParaTrilha | null> => {
      const [obra, autores] = await Promise.all([
        supabase
          .from("obras")
          .select("id, titulo_original, capa_padrao_url, ano_primeira_publicacao, sinopse_padrao")
          .eq("id", obraId!)
          .maybeSingle(),
        supabase
          .from("obra_autores")
          .select("ordem, autores(nome)")
          .eq("obra_id", obraId!)
          .order("ordem", { ascending: true }),
      ]);
      if (obra.error) throw obra.error;
      if (!obra.data) return null;
      const nomes = (autores.data ?? [])
        .map((a) => (a.autores as { nome?: string } | null)?.nome)
        .filter((n): n is string => !!n);
      return { ...obra.data, autores: nomes };
    },
  });

export interface AdicionarTrilhaInput {
  obra_id: string;
  data_inicio_sugerida?: string | null;
  data_fim_sugerida?: string | null;
  /** Metas para criar junto com a obra. Vazio ou ausente: só a obra entra. */
  metas?: MetaRascunho[];
}

export const useAdicionarTrilha = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdicionarTrilhaInput): Promise<{ trilhaId: string; metasFalharam: boolean }> => {
      if (!clubeId) throw new Error("Clube inválido");
      const { data: existentes } = await supabase
        .from("clube_trilhas")
        .select("ordem")
        .eq("clube_id", clubeId)
        .order("ordem", { ascending: false })
        .limit(1);
      const proxima = ((existentes?.[0]?.ordem as number) ?? 0) + 1;

      const { data: nova, error } = await supabase
        .from("clube_trilhas")
        .insert({
          clube_id: clubeId,
          obra_id: input.obra_id,
          ordem: proxima,
          data_inicio_sugerida: input.data_inicio_sugerida ?? null,
          data_fim_sugerida: input.data_fim_sugerida ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const metas = input.metas ?? [];
      if (!metas.length) return { trilhaId: nova.id, metasFalharam: false };

      // A obra já entrou. Se as metas falharem, o organizador monta o
      // cronograma depois pela Gestão, em vez de perder a inclusão.
      const { error: erroMetas } = await supabase.rpc("clube_salvar_cronograma", {
        p_trilha_id: nova.id,
        p_data_inicio: input.data_inicio_sugerida ?? null,
        p_data_fim: input.data_fim_sugerida ?? null,
        p_metas: metas.map((m) => ({
          titulo: m.titulo.trim(),
          percentual_alvo: m.percentual_alvo,
          data_limite: m.data_limite,
        })),
      });
      if (!erroMetas) {
        registrarEvento("cronograma_definido", { clubeId, props: { metas: metas.length, origem: "semanas" } });
      }
      return { trilhaId: nova.id, metasFalharam: !!erroMetas };
    },
    onSuccess: (resultado) => {
      if (resultado.metasFalharam) {
        toast.warning("Obra adicionada, mas as metas não foram criadas. Monte o cronograma pela Gestão.");
      } else {
        toast.success("Obra adicionada à trilha");
      }
      invalidate(qc, clubeId);
      if (clubeId) {
        qc.invalidateQueries({ queryKey: queryKeys.clubes.metas(clubeId), refetchType: "all" });
        qc.invalidateQueries({ queryKey: queryKeys.clubes.visaoGeral(clubeId), refetchType: "all" });
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar"),
  });
};

export const useRemoverTrilha = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clube_trilhas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra removida");
      invalidate(qc, clubeId);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
};

export const useReordenarTrilha = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { a: TrilhaGestaoItem; b: TrilhaGestaoItem }) => {
      const { a, b } = input;
      // troca ordens via dois updates (usa um valor temporário grande para evitar conflito de unique se houver)
      const tmp = 1_000_000 + a.ordem;
      const r1 = await supabase.from("clube_trilhas").update({ ordem: tmp }).eq("id", a.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("clube_trilhas").update({ ordem: a.ordem }).eq("id", b.id);
      if (r2.error) throw r2.error;
      const r3 = await supabase.from("clube_trilhas").update({ ordem: b.ordem }).eq("id", a.id);
      if (r3.error) throw r3.error;
    },
    onSuccess: () => invalidate(qc, clubeId),
    onError: (e: any) => toast.error(e.message ?? "Erro ao reordenar"),
  });
};
