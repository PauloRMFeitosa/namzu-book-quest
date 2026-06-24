import { supabase } from "@/integrations/supabase/client";
import { useOnboardingStore, temDadosDeOnboarding } from "@/stores/onboardingStore";

export async function executarMergeOnboarding(userId: string): Promise<void> {
  if (!temDadosDeOnboarding()) return;

  const { generos, livrosAmados, ritmo, objetivo, limpar } = useOnboardingStore.getState();

  const generosFinais = generos.length > 0 ? generos : ["ficcao"];
  const ritmoFinal = ritmo ?? "moderado";
  const objetivoFinal = objetivo ?? "descobrir";

  // 1. Salvar preferências
  const { error: errPerfil } = await supabase
    .from("perfil_preferencias")
    .upsert({
      user_id: userId,
      generos: generosFinais,
      livros_amados: livrosAmados,
      ritmo: ritmoFinal,
      objetivo: objetivoFinal,
    });
  if (errPerfil) throw new Error(`perfil_preferencias: ${errPerfil.message}`);

  // 2. Popular estante inicial
  await supabase.rpc("seed_estante_inicial", { p_user_id: userId });

  // 3. Auto-join nos clubes que o usuário manteve selecionados na T5
  const { clubesSelecionados } = useOnboardingStore.getState();
  if (clubesSelecionados.length > 0) {
    const membros = clubesSelecionados.map((clube_id) => ({
      clube_id,
      user_id: userId,
      status: "ativo",
      papel: "membro",
    }));
    await supabase
      .from("clube_membros")
      .upsert(membros, { onConflict: "clube_id,user_id", ignoreDuplicates: true });
  }

  // 4. Marcar onboarding como concluído
  await supabase
    .from("perfis")
    .update({ onboarding_completo: true })
    .eq("user_id", userId);

  // 5. Limpar estado local
  limpar();
}
