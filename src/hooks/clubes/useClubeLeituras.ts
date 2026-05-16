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
      const status =
        input.status ??
        (input.percentual >= 100 ? "concluido" : input.percentual > 0 ? "lendo" : "nao_iniciado");
      const { error } = await supabase.from("clube_progresso").upsert(
        {
          user_id: user.id,
          clube_id: clubeId,
          obra_id: input.obra_id,
          percentual: input.percentual,
          status,
          capitulo_atual: input.capitulo_atual ?? null,
          pagina_atual: input.pagina_atual ?? null,
          data_conclusao: status === "concluido" ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,clube_id,obra_id" }
      );
      if (error) throw error;

      // Sincroniza com a biblioteca do usuário: marca o livro como "lendo"
      // e garante uma entrada em usuario_leituras vinculada ao clube.
      try {
        const today = new Date().toISOString().slice(0, 10);
        const novoStatusLivro = status === "concluido" ? "lido" : "lendo";

        const { data: ul } = await supabase
          .from("usuario_livros")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("obra_id", input.obra_id)
          .maybeSingle();

        let usuarioLivroId = ul?.id as string | undefined;
        if (!usuarioLivroId) {
          const { data: novo } = await supabase
            .from("usuario_livros")
            .insert({ user_id: user.id, obra_id: input.obra_id, status: novoStatusLivro })
            .select("id")
            .single();
          usuarioLivroId = novo?.id;
        } else if (ul?.status !== novoStatusLivro && ul?.status !== "lido") {
          await supabase
            .from("usuario_livros")
            .update({ status: novoStatusLivro, updated_at: new Date().toISOString() })
            .eq("id", usuarioLivroId);
        }

        if (usuarioLivroId) {
          // Busca nome do clube para usar como intenção da pré-leitura
          const { data: clubeInfo } = await supabase
            .from("clubes")
            .select("nome")
            .eq("id", clubeId)
            .maybeSingle();
          const nomeClube = clubeInfo?.nome ?? "clube de leitura";

          const { data: jaExiste } = await supabase
            .from("usuario_leituras")
            .select("id, status")
            .eq("usuario_livro_id", usuarioLivroId)
            .eq("clube_id", clubeId)
            .maybeSingle();

          let usuarioLeituraId = jaExiste?.id as string | undefined;
          if (!usuarioLeituraId) {
            const { data: novaUL } = await supabase
              .from("usuario_leituras")
              .insert({
                usuario_livro_id: usuarioLivroId,
                tipo_origem: "clube",
                clube_id: clubeId,
                status: status === "concluido" ? "concluido" : "lendo",
                data_inicio: today,
                data_fim: status === "concluido" ? today : null,
              })
              .select("id")
              .single();
            usuarioLeituraId = novaUL?.id;
          } else if (status === "concluido" && jaExiste.status !== "concluido") {
            await supabase
              .from("usuario_leituras")
              .update({ status: "concluido", data_fim: today, updated_at: new Date().toISOString() })
              .eq("id", usuarioLeituraId);
          } else if (status !== "concluido" && jaExiste.status === "nao_iniciado") {
            await supabase
              .from("usuario_leituras")
              .update({ status: "lendo", updated_at: new Date().toISOString() })
              .eq("id", usuarioLeituraId);
          }

          if (usuarioLeituraId) {
            const nowIso = new Date().toISOString();

            // Garante pré-leitura registrada
            const { data: preExist } = await supabase
              .from("leituras")
              .select("id")
              .eq("usuario_leitura_id", usuarioLeituraId)
              .eq("tipo", "pre_leitura")
              .maybeSingle();
            if (!preExist) {
              const { data: preLeitura } = await supabase
                .from("leituras")
                .insert({
                  user_id: user.id,
                  usuario_leitura_id: usuarioLeituraId,
                  tipo: "pre_leitura",
                  data_inicio: nowIso,
                  data_fim: nowIso,
                })
                .select("id")
                .single();
              if (preLeitura?.id) {
                await supabase.from("leitura_pre").insert({
                  leitura_id: preLeitura.id,
                  intencao: `A partir do ${nomeClube}`,
                });
              }
            }

            // Sessão de leitura: busca a mais recente
            const { data: sessaoExist } = await supabase
              .from("leituras")
              .select("id, data_fim")
              .eq("usuario_leitura_id", usuarioLeituraId)
              .eq("tipo", "leitura")
              .order("data_inicio", { ascending: false })
              .limit(1)
              .maybeSingle();

            let leituraId = sessaoExist?.id as string | undefined;
            if (!leituraId) {
              const { data: novaLeitura } = await supabase
                .from("leituras")
                .insert({
                  user_id: user.id,
                  usuario_leitura_id: usuarioLeituraId,
                  tipo: "leitura",
                  data_inicio: nowIso,
                  data_fim: status === "concluido" ? nowIso : null,
                })
                .select("id")
                .single();
              leituraId = novaLeitura?.id;
            }

            if (leituraId) {
              await supabase.from("leitura_progresso").insert({
                leitura_id: leituraId,
                user_id: user.id,
                paginas_lidas: input.pagina_atual ?? null,
                percentual_lido: input.percentual ?? null,
              });
            }

            // Ao concluir: fecha TODAS as sessões de leitura abertas
            if (status === "concluido") {
              await supabase
                .from("leituras")
                .update({ data_fim: nowIso, updated_at: nowIso })
                .eq("usuario_leitura_id", usuarioLeituraId)
                .eq("tipo", "leitura")
                .is("data_fim", null);
            }
          }
        }
      } catch (e) {
        console.warn("sync biblioteca falhou", e);
      }
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
