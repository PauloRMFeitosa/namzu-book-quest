import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useFeatureFlags, type FeatureFlagKey } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface Props {
  flag: FeatureFlagKey;
  children: ReactNode;
}

export const FeatureRoute = ({ flag, children }: Props) => {
  const { flags, loading } = useFeatureFlags();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (loading || adminLoading) return null;
  if (isAdmin || flags[flag]) return <>{children}</>;
  return <Navigate to="/" replace />;
};
