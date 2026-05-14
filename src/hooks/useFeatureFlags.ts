import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlagKey =
  | "show_clubes"
  | "show_metas"
  | "show_historico"
  | "show_notificacoes"
  | "show_gamificacao_home"
  | "show_clube_feed"
  | "show_clube_leituras"
  | "show_clube_canais"
  | "show_clube_eventos"
  | "show_clube_membros"
  | "show_clube_conteudos"
  | "show_clube_microgrupos";

const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  show_clubes: true,
  show_metas: true,
  show_historico: true,
  show_notificacoes: true,
  show_gamificacao_home: true,
  show_clube_feed: true,
  show_clube_leituras: true,
  show_clube_canais: true,
  show_clube_eventos: true,
  show_clube_membros: true,
  show_clube_conteudos: true,
  show_clube_microgrupos: true,
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
