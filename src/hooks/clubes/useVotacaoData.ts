import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import { registrarEvento } from "@/services/analytics";
import { totalDeVotantes, type VotacaoDeData } from "@/lib/votacaoData";

// Votação de data do encontro (Fase 3). Quem faz parte do clube lê e vota; só
// o organizador e admins abrem, encerram e cancelam. Toda escrita passa por
// funções do banco.

/** A votação aberta do clube, com as datas e os votos. Nulo quando não há. */
export const useVotacaoAberta = (clubeId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.votacaoData(clubeId ?? ""),
    enabled: !!clubeId && habilitado,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<VotacaoDeData | null> => {
      const { data: votacao, error } = await supabase
        .from("clube_votacoes_data")
        .select("id, clube_id, titulo, url_evento, status, created_at")
        .eq("clube_id", clubeId!)
        .eq("status", "aberta")
        .maybeSingle();
      if (error) throw error;
      if (!votacao) return null;

      const { data: opcoes, error: erroOpcoes } = await supabase
        .from("clube_votacao_opcoes")
        .select("id, inicio_em")
        .eq("votacao_id", votacao.id)
        .order("inicio_em", { ascending: true });
      if (erroOpcoes) throw erroOpcoes;

      const ids = (opcoes ?? []).map((o: { id: string }) => o.id);
      const votosPorOpcao = new Map<string, string[]>();
      if (ids.length) {
        const { data: votos, error: erroVotos } = await supabase
          .from("clube_votacao_votos")
          .select("opcao_id, user_id")
          .in("opcao_id", ids);
        if (erroVotos) throw erroVotos;
        for (const v of (votos ?? []) as { opcao_id: string; user_id: string }[]) {
          votosPorOpcao.set(v.opcao_id, [...(votosPorOpcao.get(v.opcao_id) ?? []), v.user_id]);
        }
      }

      return {
        ...votacao,
        opcoes: (opcoes ?? []).map((o: { id: string; inicio_em: string }) => ({
          id: o.id,
          inicio_em: o.inicio_em,
          votos: votosPorOpcao.get(o.id) ?? [],
        })),
      } as VotacaoDeData;
    },
  });

const invalidar = (qc: ReturnType<typeof useQueryClient>, clubeId: string | undefined) => {
  if (!clubeId) return;
  qc.invalidateQueries({ queryKey: queryKeys.clubes.votacaoData(clubeId), refetchType: "all" });
};

export const useAbrirVotacao = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { titulo: string; opcoes: string[]; urlEvento: string }) => {
      const { error } = await supabase.rpc("clube_abrir_votacao_data", {
        p_clube_id: clubeId,
        p_titulo: input.titulo.trim(),
        p_opcoes: input.opcoes,
        p_url_evento: input.urlEvento.trim() || null,
      });
      if (error) throw error;
      registrarEvento("votacao_data_aberta", { clubeId, props: { opcoes: input.opcoes.length } });
    },
    onSuccess: () => {
      toast.success("Votação aberta. Os membros foram avisados.");
      invalidar(qc, clubeId);
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível abrir a votação"),
  });
};

export const useVotarData = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { votacaoId: string; opcoes: string[] }) => {
      const { error } = await supabase.rpc("clube_votar_data", {
        p_votacao_id: input.votacaoId,
        p_opcoes: input.opcoes,
      });
      if (error) throw error;
      registrarEvento("voto_data_registrado", { clubeId, props: { opcoes: input.opcoes.length } });
    },
    onSuccess: () => invalidar(qc, clubeId),
    onError: (e: { message?: string }) => {
      toast.error(e.message ?? "Não foi possível registrar o voto");
      invalidar(qc, clubeId);
    },
  });
};

export const useEncerrarVotacao = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { votacao: VotacaoDeData; opcaoId: string }) => {
      const { error } = await supabase.rpc("clube_encerrar_votacao_data", {
        p_votacao_id: input.votacao.id,
        p_opcao_id: input.opcaoId,
      });
      if (error) throw error;
      registrarEvento("votacao_data_encerrada", {
        clubeId,
        props: { votantes: totalDeVotantes(input.votacao), opcoes: input.votacao.opcoes.length },
      });
    },
    onSuccess: () => {
      toast.success("Encontro marcado. Quem votou nessa data já está confirmado.");
      invalidar(qc, clubeId);
      qc.invalidateQueries({ queryKey: ["clube-eventos", clubeId], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["clube-proximos-eventos", clubeId], refetchType: "all" });
      if (clubeId) qc.invalidateQueries({ queryKey: queryKeys.clubes.visaoGeral(clubeId), refetchType: "all" });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível marcar o encontro"),
  });
};

export const useCancelarVotacao = (clubeId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (votacaoId: string) => {
      const { error } = await supabase.rpc("clube_cancelar_votacao_data", { p_votacao_id: votacaoId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Votação cancelada");
      invalidar(qc, clubeId);
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Não foi possível cancelar a votação"),
  });
};
