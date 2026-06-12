import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LANDING_PAGE_OPTIONS = [
  { value: "/", label: "Home (padrão)" },
  { value: "/clubes", label: "Clubes" },
  { value: "/busca", label: "Busca" },
  { value: "/livros", label: "Livros" },
  { value: "/leituras", label: "Leituras" },
] as const;

export type LandingPageRoute = (typeof LANDING_PAGE_OPTIONS)[number]["value"];

const QUERY_KEY = ["app_settings", "landing_page"] as const;

export const useLandingPage = () => {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", "landing_page")
        .maybeSingle();
      return (data?.value as string) ?? "/";
    },
  });
  return (data ?? "/") as LandingPageRoute;
};

export const useSaveLandingPage = () => {
  const qc = useQueryClient();
  return async (route: LandingPageRoute) => {
    await (supabase as any)
      .from("app_settings")
      .upsert({ key: "landing_page", value: route, updated_at: new Date().toISOString() }, { onConflict: "key" });
    qc.invalidateQueries({ queryKey: QUERY_KEY });
  };
};
