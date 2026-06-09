import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { toast } from "sonner";

export interface Mensagem {
  id: string;
  thread_id: string | null;
  user_id: string | null;
  mensagem: string;
  reply_to_id: string | null;
  editado: boolean | null;
  deleted_at: string | null;
  created_at: string | null;
  autor?: {
    user_id: string;
    nome_exibicao: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export const useMensagens = (threadId: string | null | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["mensagens", threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<Mensagem[]> => {
      const { data, error } = await supabase
        .from("clube_mensagens")
        .select("*")
        .eq("thread_id", threadId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      const msgs = (data ?? []) as any[];
      const userIds = [...new Set(msgs.map((m) => m.user_id).filter(Boolean))];
      let perfis: any[] = [];
      if (userIds.length) {
        const { data: p } = await supabase
          .from("perfis")
          .select("user_id, nome_exibicao, username, avatar_url")
          .in("user_id", userIds);
        perfis = p ?? [];
      }
      const map = new Map(perfis.map((p) => [p.user_id, p]));
      return msgs.map((m) => ({ ...m, autor: map.get(m.user_id) ?? null }));
    },
  });

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`mensagens:${threadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clube_mensagens", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["mensagens", threadId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, qc]);

  return query;
};

export const useEnviarMensagem = (threadId: string | null | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { texto: string; reply_to_id?: string | null }) => {
      if (!user) throw new Error("Não autenticado");
      if (!threadId) throw new Error("Thread inválido");
      const texto = input.texto.trim();
      if (!texto) return;
      const { error } = await supabase.from("clube_mensagens").insert({
        thread_id: threadId,
        user_id: user.id,
        mensagem: texto,
        reply_to_id: input.reply_to_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensagens", threadId] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });
};

export const useDeletarMensagem = (threadId: string | null | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clube_mensagens")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensagens", threadId] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao apagar"),
  });
};
