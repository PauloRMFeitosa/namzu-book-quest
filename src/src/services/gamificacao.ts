import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GamificacaoPerfil = Tables<"gamificacao_perfis">;

const DEFAULT_PERFIL: GamificacaoPerfil = {
  user_id: "",
  xp_total: 0,
  nivel: 1,
  streak_atual: 0,
  streak_maximo: 0,
  xp_proximo_nivel: 100,
  ultima_atividade_date: null,
  updated_at: null,
};

export const gamificacaoService = {
  buscarPerfil: async (userId: string): Promise<GamificacaoPerfil> => {
    const { data, error } = await supabase
      .from("gamificacao_perfis")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? { ...DEFAULT_PERFIL, user_id: userId };
  },
};
