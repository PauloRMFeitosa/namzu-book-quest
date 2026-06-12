import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useFeatureFlags, type FeatureFlagKey } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface Props {
  flag: FeatureFlagKey;
  children: ReactNode;
}

export const FeatureRoute = ({ flag, children }: Props) => {
  const { flags, loading } = useFeatureFlags();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const location = useLocation();

  if (loading || adminLoading) return null;

  // Admins sempre passam
  if (isAdmin) return <>{children}</>;

  // Flag ativa: acesso normal
  if (flags[flag]) return <>{children}</>;

  // Bypass: navegação originada de dentro de um clube (ex: iniciar leitura no Modo Clubes)
  if (location.state?.fromClube) return <>{children}</>;

  return <Navigate to="/" replace />;
};
