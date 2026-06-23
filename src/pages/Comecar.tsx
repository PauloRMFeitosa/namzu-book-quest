import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { trackOnboarding } from "@/services/analyticsOnboarding";
import { ProgressoOnboarding } from "@/components/onboarding/ProgressoOnboarding";
import { TelaBoasVindas } from "@/components/onboarding/TelaBoasVindas";
import { QuizGeneros } from "@/components/onboarding/QuizGeneros";
import { QuizLivros } from "@/components/onboarding/QuizLivros";
import { QuizObjetivo } from "@/components/onboarding/QuizObjetivo";
import { TelaEstantePronta } from "@/components/onboarding/TelaEstantePronta";
import { TelaCriarConta } from "@/components/onboarding/TelaCriarConta";

const NOMES_ETAPA: Record<number, string> = {
  1: "boas_vindas",
  2: "generos",
  3: "livros",
  4: "objetivo",
  5: "resultado",
  6: "criar_conta",
};

const Comecar = () => {
  const { user, loading } = useAuth();
  const { etapaAtual, setEtapaAtual, generos, livrosAmados, objetivo } = useOnboardingStore();
  const location = useLocation();
  const returnTo: string = (location.state as any)?.returnTo ?? "/";
  const etapaAnteriorRef = useRef<number>(etapaAtual);

  // Rastreia entrada em cada etapa + abandono (beforeunload em T2–T5)
  useEffect(() => {
    if (etapaAtual === 1) trackOnboarding("onboarding_iniciado");
    if (etapaAtual === 5) trackOnboarding("onboarding_resultado_visto");
    if (etapaAtual === 6) trackOnboarding("onboarding_signup_iniciado");
    etapaAnteriorRef.current = etapaAtual;
  }, [etapaAtual]);

  useEffect(() => {
    if (etapaAtual < 2 || etapaAtual > 5) return;
    const handler = () =>
      trackOnboarding("onboarding_abandonado", { etapa: etapaAtual });
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [etapaAtual]);

  // Usuário já logado → destino original ou app principal
  if (!loading && user) return <Navigate to={returnTo} replace />;

  const avancar = (pulou = false) => {
    const props =
      etapaAtual === 2 ? { etapa: etapaAtual, total_generos: generos.length }
      : etapaAtual === 3 ? { etapa: etapaAtual, total_livros: livrosAmados.length }
      : etapaAtual === 4 ? { etapa: etapaAtual, objetivo: objetivo ?? "pulado" }
      : { etapa: etapaAtual };

    trackOnboarding(
      pulou ? "onboarding_etapa_pulada" : "onboarding_etapa_concluida",
      props
    );
    setEtapaAtual(Math.min(etapaAtual + 1, 6));
  };

  const pular = () => avancar(true);
  const continuar = () => avancar(false);

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {etapaAtual >= 2 && etapaAtual <= 4 && (
        <ProgressoOnboarding etapa={etapaAtual} />
      )}

      {etapaAtual === 1 && <TelaBoasVindas onAvancar={continuar} />}
      {etapaAtual === 2 && <QuizGeneros onAvancar={continuar} onPular={pular} />}
      {etapaAtual === 3 && <QuizLivros onAvancar={continuar} onPular={pular} />}
      {etapaAtual === 4 && <QuizObjetivo onAvancar={continuar} onPular={pular} />}
      {etapaAtual === 5 && <TelaEstantePronta onAvancar={continuar} />}
      {etapaAtual === 6 && <TelaCriarConta returnTo={returnTo} />}
    </div>
  );
};

export default Comecar;
