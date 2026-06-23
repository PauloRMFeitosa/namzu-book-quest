import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { temDadosDeOnboarding } from "@/stores/onboardingStore";
import { executarMergeOnboarding } from "@/services/onboardingMerge";

// Componente invisível montado em App.tsx.
// Intercepta o SIGNED_IN (OAuth Google ou confirmação de e-mail) e:
//   1. executa o merge de onboarding se há dados pendentes no localStorage
//   2. navega para returnTo salvo no sessionStorage (deep link após OAuth)
export function OnboardingAutoMerge() {
  const mergeEmAndamento = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "SIGNED_IN" || !session?.user) return;
        if (mergeEmAndamento.current) return;

        mergeEmAndamento.current = true;
        try {
          if (temDadosDeOnboarding()) {
            await executarMergeOnboarding(session.user.id);
          }
        } catch {
          // falha silenciosa — o usuário continua navegando normalmente
        } finally {
          mergeEmAndamento.current = false;
        }

        // Após OAuth com Google, retornar ao destino original
        const returnTo = sessionStorage.getItem("namzu_returnTo");
        if (returnTo) {
          sessionStorage.removeItem("namzu_returnTo");
          navigate(returnTo, { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
