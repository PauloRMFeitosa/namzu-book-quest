import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TrilhaItem {
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
    sinopse_padrao: string | null;
  } | null;
  /** total de páginas (da primeira edição encontrada) */
  total_paginas: number | null;
  /** progresso coletivo médio (0-100) */
  progresso_coletivo: number;
  /** quantos membros já concluíram */
  concluidos: number;
  /** total de membros */
  total_membros: number;
  /** progresso do usuário corrente */
  meu_progresso: {
    status: string;
    percentual: number;
    capitulo_atual: string | null;
    pagina_atual: number | null;
    data_conclusao: string | null;
  } | null;
}

export const useClubeLeituras = (clubeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clube-leituras", clubeId, user?.id],
    enabled: !!clubeId,
    queryFn: async (): Promise<TrilhaItem[]> => {
      const { data: trilhas, error } = await supabase
        .from("clube_trilhas")
        .select("id, clube_id, obra_id, ordem, data_inicio_sugerida, data_fim_sugerida")
        .eq("clube_id", clubeId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      if (!trilhas?.length) return [];

      const obraIds = trilhas.map((t) => t.obra_id);

      const [obrasRes, progRes, membrosRes, edicoesRes] = await Promise.all([
        supabase
          .from("obras")
          .select("id, titulo_original, capa_padrao_url, sinopse_padrao")
          .in("id", obraIds),
        supabase
          .from("clube_progresso")
          .select("obra_id, user_id, status, percentual, capitulo_atual, pagina_atual, data_conclusao")
          .eq("clube_id", clubeId!)
          .in("obra_id", obraIds),
        supabase
          .from("clube_membros")
          .select("user_id", { count: "exact", head: true })
          .eq("clube_id", clubeId!)
          .eq("status", "ativo"),
        supabase
          .from("edicoes")
          .select("obra_id, num_paginas")
          .in("obra_id", obraIds)
          .not("num_paginas", "is", null),
      ]);

      const paginasPorObra = new Map<string, number>();
      (edicoesRes.data ?? []).forEach((e: any) => {
        if (e.num_paginas && !paginasPorObra.has(e.obra_id)) {
          paginasPorObra.set(e.obra_id, e.num_paginas);
        }
      });

      const obraMap = new Map((obrasRes.data ?? []).map((o: any) => [o.id, o]));
      const progPorObra = new Map<string, any[]>();
      (progRes.data ?? []).forEach((p: any) => {
        const arr = progPorObra.get(p.obra_id) ?? [];
        arr.push(p);
        progPorObra.set(p.obra_id, arr);
      });
      const totalMembros = membrosRes.count ?? 0;

      return trilhas.map((t: any) => {
        const lista = progPorObra.get(t.obra_id) ?? [];
        const soma = lista.reduce((a, p) => a + (p.percentual ?? 0), 0);
        const media = lista.length ? Math.round(soma / Math.max(lista.length, 1)) : 0;
        const concluidos = lista.filter((p) => p.status === "concluido").length;
        const meu = user ? lista.find((p) => p.user_id === user.id) ?? null : null;

        return {
          ...t,
          obra: obraMap.get(t.obra_id) ?? null,
          total_paginas: paginasPorObra.get(t.obra_id) ?? null,
          progresso_coletivo: media,
          concluidos,
          total_membros: totalMembros,
          meu_progresso: meu
            ? {
                status: meu.status,
                percentual: meu.percentual ?? 0,
                capitulo_atual: meu.capitulo_atual,
                pagina_atual: meu.pagina_atual,
                data_conclusao: meu.data_conclusao,
              }
            : null,
        } as TrilhaItem;
      });
    },
  });
};

export const useSalvarProgresso = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      obra_id: string;
      percentual: number;
      status?: string;
      capitulo_atual?: string | null;
      pagina_atual?: number | null;
    }) => {
      if (!user || !clubeId) throw new Error("Não autenticado");
      const { error } = await supabase.functions.invoke("salvar-progresso-leitura", {
        body: {
          clube_id: clubeId,
          obra_id: input.obra_id,
          percentual: input.percentual,
          capitulo_atual: input.capitulo_atual ?? null,
          pagina_atual: input.pagina_atual ?? null,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Progresso atualizado");
      qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
      qc.invalidateQueries({ queryKey: ["livros"] });
      qc.invalidateQueries({ queryKey: ["leituras"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};
