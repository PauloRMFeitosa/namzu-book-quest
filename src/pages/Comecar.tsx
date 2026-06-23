import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { ProgressoOnboarding } from "@/components/onboarding/ProgressoOnboarding";
import { TelaBoasVindas } from "@/components/onboarding/TelaBoasVindas";
import { QuizGeneros } from "@/components/onboarding/QuizGeneros";
import { QuizLivros } from "@/components/onboarding/QuizLivros";
import { QuizObjetivo } from "@/components/onboarding/QuizObjetivo";
import { TelaEstantePronta } from "@/components/onboarding/TelaEstantePronta";
import { TelaCriarConta } from "@/components/onboarding/TelaCriarConta";

const Comecar = () => {
  const { user, loading } = useAuth();
  const { etapaAtual, setEtapaAtual } = useOnboardingStore();
  const location = useLocation();
  const returnTo: string = (location.state as any)?.returnTo ?? "/";

  // Usuário já logado → destino original ou app principal
  if (!loading && user) return <Navigate to={returnTo} replace />;

  const avancar = () => setEtapaAtual(Math.min(etapaAtual + 1, 6));
  const pular = avancar;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {etapaAtual >= 2 && etapaAtual <= 4 && (
        <ProgressoOnboarding etapa={etapaAtual} />
      )}

      {etapaAtual === 1 && <TelaBoasVindas onAvancar={avancar} />}
      {etapaAtual === 2 && <QuizGeneros onAvancar={avancar} onPular={pular} />}
      {etapaAtual === 3 && <QuizLivros onAvancar={avancar} onPular={pular} />}
      {etapaAtual === 4 && <QuizObjetivo onAvancar={avancar} onPular={pular} />}
      {etapaAtual === 5 && <TelaEstantePronta onAvancar={avancar} />}
      {etapaAtual === 6 && <TelaCriarConta returnTo={returnTo} />}
    </div>
  );
};

export default Comecar;
