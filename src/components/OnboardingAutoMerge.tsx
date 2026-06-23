import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { temDadosDeOnboarding } from "@/stores/onboardingStore";
import { executarMergeOnboarding } from "@/services/onboardingMerge";

// Componente invisível montado em App.tsx.
// Intercepta o SIGNED_IN do OAuth (Google) e executa o merge de onboarding
// quando há dados pendentes no localStorage.
export function OnboardingAutoMerge() {
  const mergeEmAndamento = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "SIGNED_IN" || !session?.user) return;
        if (mergeEmAndamento.current) return;
        if (!temDadosDeOnboarding()) return;

        mergeEmAndamento.current = true;
        try {
          await executarMergeOnboarding(session.user.id);
        } catch {
          // falha silenciosa — o usuário continua navegando normalmente
        } finally {
          mergeEmAndamento.current = false;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
