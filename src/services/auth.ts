import { supabase } from "@/integrations/supabase/client";

export const authService = {
  signInWithGoogle: async (returnTo?: string): Promise<void> => {
    // Salva returnTo no sessionStorage para uso no pós-OAuth (lido por OnboardingAutoMerge)
    if (returnTo && returnTo !== "/") {
      sessionStorage.setItem("namzu_returnTo", returnTo);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  },

  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
