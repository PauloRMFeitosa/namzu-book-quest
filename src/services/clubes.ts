import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Clube = Tables<"clubes">;
export type ClubePost = Tables<"clube_posts">;

export const clubesService = {
  listarAtivos: async (): Promise<Clube[]> => {
    const { data } = await supabase
      .from("clubes")
      .select("*")
      .eq("is_ativo", true);
    return data ?? [];
  },

  buscarPorId: async (id: string): Promise<Clube | null> => {
    const { data } = await supabase
      .from("clubes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  },

  listarMembrosIds: async (userId: string): Promise<string[]> => {
    const { data } = await supabase
      .from("clube_membros")
      .select("clube_id")
      .eq("user_id", userId);
    return (data ?? []).map((r) => r.clube_id);
  },

  entrar: async (clubeId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from("clube_membros")
      .insert({ clube_id: clubeId, user_id: userId });
    if (error) throw error;
  },

  listarPosts: async (clubeId: string): Promise<ClubePost[]> => {
    const { data } = await supabase
      .from("clube_posts")
      .select("*")
      .eq("clube_id", clubeId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  criarPost: async (
    payload: TablesInsert<"clube_posts">
  ): Promise<void> => {
    const { error } = await supabase.from("clube_posts").insert(payload);
    if (error) throw error;
  },
};
