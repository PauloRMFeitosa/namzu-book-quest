import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecomendacaoIA { clube_id: string; motivo: string }
export interface MatchIA { user_id: string; nome: string; motivo: string }

async function callClubeAI<T = any>(body: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("clube-ai", { body });
  if (error) {
    const msg = (error as any)?.context?.body
      ? JSON.parse((error as any).context.body)?.message
      : error.message;
    throw new Error(msg ?? error.message);
  }
  if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
  return data as T;
}

export const useRecomendacoesIA = () =>
  useMutation({
    mutationFn: () => callClubeAI<{ recomendacoes: RecomendacaoIA[] }>({ acao: "recomendacoes" }),
    onError: (e: any) => toast.error(e.message ?? "Erro na IA"),
  });

export const useResumoDiscussaoIA = () =>
  useMutation({
    mutationFn: (clube_id: string) =>
      callClubeAI<{ texto: string }>({ acao: "resumo_discussao", clube_id }),
    onError: (e: any) => toast.error(e.message ?? "Erro na IA"),
  });

export const usePerguntasProfundasIA = () =>
  useMutation({
    mutationFn: (input: { post_id?: string; texto?: string }) =>
      callClubeAI<{ perguntas: string[] }>({
        acao: "perguntas_profundas",
        post_id: input.post_id,
        payload: { texto: input.texto },
      }),
    onError: (e: any) => toast.error(e.message ?? "Erro na IA"),
  });

export const useMatchmakingIA = () =>
  useMutation({
    mutationFn: (clube_id: string) =>
      callClubeAI<{ matches: MatchIA[] }>({ acao: "matchmaking", clube_id }),
    onError: (e: any) => toast.error(e.message ?? "Erro na IA"),
  });

export const useLeituraCopiloto = () =>
  useMutation({
    mutationFn: async (input: {
      usuario_leitura_id: string;
      modo: "perguntas_guia" | "explicar_conceito" | "resumo_capitulo" | "livre";
      pergunta?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("leitura-copiloto", { body: input });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).message);
      return data as { texto: string };
    },
    onError: (e: any) => toast.error(e.message ?? "Erro no copiloto"),
  });
