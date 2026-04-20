import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logoNamzu from "@/assets/logo-namzu.png";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center animate-fade-in">
        <img src={logoNamzu} alt="NAMZU" className="w-24 h-24 rounded-3xl shadow-elevated object-cover" />
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">NAMZU</h1>
        <p className="text-lg text-muted-foreground">A sabedoria começa aqui!!!</p>
        <div className="flex flex-col gap-3 w-full mt-6">
          <Button onClick={() => navigate("/signup")} className="h-[52px] text-base font-semibold rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active">
            Começar
          </Button>
          <Button onClick={() => navigate("/login")} variant="outline" className="h-[52px] text-base font-semibold rounded-2xl border-2">
            Já tenho conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
