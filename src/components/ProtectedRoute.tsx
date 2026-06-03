import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "./AppLayout";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Verifica se o usuário já iniciou o Código ME (perfil_interesses).
  const { data: temInteresses, isLoading: chk } = useQuery({
    queryKey: ["perfil-interesses-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("perfil_interesses")
        .select("interesse_id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return (count ?? 0) > 0;
    },
    staleTime: 60_000,
  });

  if (loading || (user && chk)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/onboarding" replace />;

  const onboardingDone =
    typeof window !== "undefined" && localStorage.getItem("namzu_onboarding_completed") === "1";
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;

  // Novo usuário sem interesses → obrigatório fazer o onboarding do Código ME
  if (temInteresses === false && location.pathname !== "/onboarding-interesses") {
    return <Navigate to="/onboarding-interesses" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};
