import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "./AppLayout";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/onboarding" replace />;
  const onboardingDone = typeof window !== "undefined" && localStorage.getItem("namzu_onboarding_completed") === "1";
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;
  return <AppLayout>{children}</AppLayout>;
};
