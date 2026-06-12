import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "./AppLayout";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useLandingPage } from "@/hooks/useLandingPage";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  const landingPage = useLandingPage();

  // Fonte de verdade: onboarding_completo no banco (coluna adicionada na Fase 2)
  // Fallback rápido via localStorage para evitar flash de redirect no primeiro render.
  const { data: perfil, isLoading: chk } = useQuery({
    queryKey: ["perfil-onboarding", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("perfis")
        .select("onboarding_completo")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (loading || (user && chk)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/onboarding" replace />;

  // Onboarding: verificar localStorage (rápido) + banco (confiável)
  const localFlag =
    typeof window !== "undefined" && localStorage.getItem("namzu_onboarding_completed") === "1";
  const dbFlag = perfil?.onboarding_completo ?? false;
  const onboardingDone = localFlag || dbFlag;

  // Se o onboarding está desabilitado no admin, bypass completo do redirect
  if (!onboardingDone && flags.show_onboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Se o Código ME está desabilitado no admin, bypass do redirect para interesses
  if (!dbFlag && flags.show_codigo_me && location.pathname !== "/onboarding-interesses") {
    return <Navigate to="/onboarding-interesses" replace />;
  }

  // Redirect da landing page configurada: só aplica em "/" para não-admins
  if (!isAdmin && location.pathname === "/" && landingPage !== "/") {
    return <Navigate to={landingPage} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};
