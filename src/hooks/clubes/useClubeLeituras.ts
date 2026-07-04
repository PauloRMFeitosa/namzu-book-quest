import { useEffect } from "react";
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
  total_paginas: number | null;
  progresso_coletivo: number;
  concluidos: number;
  total_membros: number;
  meu_progresso: {
    status: string;
    percentual: number;
    capitulo_atual: string | null;
    pagina_atual: number | null;
    data_conclusao: string | null;
    usuario_leitura_id: string;
  } | null;
}

/**
 * Progresso da trilha agora deriva de:
 *   usuario_leituras (clube_id = clubeId) → leituras → leitura_progresso
 * A tabela clube_progresso foi descontinuada e não é mais consultada.
 */
export const useClubeLeituras = (clubeId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Realtime: atualiza a trilha quando qualquer membro conclui ou altera sua leitura,
  // ou quando o curador adiciona/remove/reordena obras na trilha
  useEffect(() => {
    if (!clubeId) return;
    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId], refetchType: "all" });
    };
    const channel = supabase
      .channel(`clube-leituras-rt:${clubeId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "usuario_leituras",
        filter: `clube_id=eq.${clubeId}`,
      }, invalidar)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "clube_trilhas",
        filter: `clube_id=eq.${clubeId}`,
      }, () => {
        invalidar();
        qc.invalidateQueries({ queryKey: ["clube-trilhas-gestao", clubeId], refetchType: "all" });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubeId, qc]);

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

      const [obrasRes, membrosRes, edicoesRes, leiturasRes] = await Promise.all([
        supabase
          .from("obras")
          .select("id, titulo_original, capa_padrao_url, sinopse_padrao")
          .in("id", obraIds),
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
        supabase
          .from("usuario_leituras")
          .select(
            "id, status, data_fim, usuario_livro_id, usuario_livros!inner(user_id, obra_id)",
          )
          .eq("clube_id", clubeId!)
          .in("usuario_livros.obra_id", obraIds),
      ]);

      const leiturasUsuario = (leiturasRes.data ?? []) as any[];
      const leituraIds = leiturasUsuario.map((l) => l.id);

      // Carrega sessões + último progresso registrado por usuario_leitura
      let percentualPorUL = new Map<string, number>();
      let paginaPorUL = new Map<string, number | null>();
      if (leituraIds.length) {
        const { data: sessoes } = await supabase
          .from("leituras")
          .select("id, usuario_leitura_id")
          .in("usuario_leitura_id", leituraIds);
        const sessoesArr = (sessoes ?? []) as any[];
        const sessaoToUL = new Map<string, string>(
          sessoesArr.map((s) => [s.id as string, s.usuario_leitura_id as string]),
        );
        const sessIds = sessoesArr.map((s) => s.id as string);
        if (sessIds.length) {
          const { data: progs } = await supabase
            .from("leitura_progresso")
            .select("leitura_id, percentual_lido, paginas_lidas, data_registro")
            .in("leitura_id", sessIds)
            .order("data_registro", { ascending: false });
          (progs ?? []).forEach((p: any) => {
            const ul = sessaoToUL.get(p.leitura_id);
            if (!ul) return;
            const atual = percentualPorUL.get(ul) ?? -1;
            const pct = Number(p.percentual_lido ?? 0);
            if (pct > atual) {
              percentualPorUL.set(ul, pct);
              paginaPorUL.set(ul, p.paginas_lidas ?? null);
            }
          });
        }
      }

      const paginasPorObra = new Map<string, number>();
      (edicoesRes.data ?? []).forEach((e: any) => {
        if (e.num_paginas && !paginasPorObra.has(e.obra_id)) {
          paginasPorObra.set(e.obra_id, e.num_paginas);
        }
      });

      const obraMap = new Map((obrasRes.data ?? []).map((o: any) => [o.id, o]));

      // agrupa leituras por obra
      const leiturasPorObra = new Map<string, any[]>();
      leiturasUsuario.forEach((l) => {
        const obraId = l.usuario_livros?.obra_id;
        if (!obraId) return;
        const arr = leiturasPorObra.get(obraId) ?? [];
        arr.push(l);
        leiturasPorObra.set(obraId, arr);
      });

      const totalMembros = membrosRes.count ?? 0;

      const calcPct = (ulId: string, obraId: string, concluido: boolean): number => {
        if (concluido) return 100;
        const paginas = paginaPorUL.get(ulId) ?? null;
        const totalPags = paginasPorObra.get(obraId) ?? null;
        if (paginas !== null && totalPags && totalPags > 0) {
          return Math.min(100, Math.round((paginas / totalPags) * 100));
        }
        return percentualPorUL.get(ulId) ?? 0;
      };

      return trilhas.map((t: any) => {
        const lista = leiturasPorObra.get(t.obra_id) ?? [];
        const percentuais = lista.map((l) => calcPct(l.id, t.obra_id, l.status === "concluido"));
        const media = percentuais.length
          ? Math.round(percentuais.reduce((a, b) => a + b, 0) / percentuais.length)
          : 0;
        const concluidos = lista.filter((l) => l.status === "concluido").length;

        const minhaLeitura = user ? lista.find((l) => l.usuario_livros?.user_id === user.id) : null;
        let meu_progresso: TrilhaItem["meu_progresso"] = null;
        if (minhaLeitura) {
          const concluida = minhaLeitura.status === "concluido";
          const pct = calcPct(minhaLeitura.id, t.obra_id, concluida);
          meu_progresso = {
            status: minhaLeitura.status,
            percentual: pct,
            capitulo_atual: null,
            pagina_atual: paginaPorUL.get(minhaLeitura.id) ?? null,
            data_conclusao: minhaLeitura.data_fim,
            usuario_leitura_id: minhaLeitura.id,
          };
        }

        return {
          ...t,
          obra: obraMap.get(t.obra_id) ?? null,
          total_paginas: paginasPorObra.get(t.obra_id) ?? null,
          progresso_coletivo: media,
          concluidos,
          total_membros: totalMembros,
          meu_progresso,
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
      qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["livros"] });
      qc.invalidateQueries({ queryKey: ["leituras"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};
