import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlagKey =
  | "show_clubes"
  | "show_metas"
  | "show_historico"
  | "show_notificacoes"
  | "show_leituras"
  | "show_gamificacao_home"
  | "show_meta_diaria"
  | "show_clube_feed"
  | "show_clube_leituras"
  | "show_clube_canais"
  | "show_clube_eventos"
  | "show_clube_membros"
  | "show_clube_conteudos"
  | "show_clube_microgrupos"
  | "show_clube_ai_copiloto"
  | "show_clube_ai_provocacao"
  | "show_clube_ai_resumo"
  | "show_clube_ai_matchmaking"
  | "show_clube_ai_recomendacoes"
  | "show_gamificacao_clube"
  // visibilidade global de páginas (override sem alterar flags individuais)
  | "pages_global_visible"
  // menu inferior por página
  | "show_menu_inferior_home"
  | "show_menu_inferior_clubes"
  | "show_menu_inferior_busca"
  | "show_menu_inferior_livros"
  | "show_menu_inferior_leituras"
  | "show_menu_inferior_perfil"
  // fluxos de entrada
  | "show_onboarding"
  | "show_codigo_me";

const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  show_clubes: true,
  show_metas: true,
  show_historico: true,
  show_notificacoes: true,
  show_leituras: true,
  show_gamificacao_home: true,
  show_meta_diaria: true,
  show_clube_feed: true,
  show_clube_leituras: true,
  show_clube_canais: true,
  show_clube_eventos: true,
  show_clube_membros: true,
  show_clube_conteudos: true,
  show_clube_microgrupos: true,
  show_clube_ai_copiloto: true,
  show_clube_ai_provocacao: true,
  show_clube_ai_resumo: true,
  show_clube_ai_matchmaking: true,
  show_clube_ai_recomendacoes: true,
  // desligada por padrão até a gamificação de clube ser validada (Fase 4)
  show_gamificacao_clube: false,
  pages_global_visible: true,
  show_menu_inferior_home: true,
  show_menu_inferior_clubes: true,
  show_menu_inferior_busca: true,
  show_menu_inferior_livros: true,
  show_menu_inferior_leituras: true,
  show_menu_inferior_perfil: true,
  show_onboarding: true,
  show_codigo_me: true,
};

export const useFeatureFlags = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["app_settings", "feature_flags"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("key, value");
      if (error) {
        console.warn("[useFeatureFlags]", error.message);
        return DEFAULTS;
      }
      const out: Record<string, boolean> = { ...DEFAULTS };
      for (const row of data ?? []) {
        const v = row.value;
        out[row.key] = typeof v === "boolean" ? v : v === "true" || v === true;
      }
      return out as Record<FeatureFlagKey, boolean>;
    },
  });

  return {
    flags: (data ?? DEFAULTS) as Record<FeatureFlagKey, boolean>,
    loading: isLoading,
  };
};
