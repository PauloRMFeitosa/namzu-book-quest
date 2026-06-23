import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { GoogleButton } from "@/components/GoogleButton";
import logoNamzu from "@/assets/logo-namzu.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo: string = (location.state as any)?.returnTo ?? "/";
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to={returnTo} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col px-6 py-8">
      <button onClick={() => navigate(-1)} className="self-start text-muted-foreground p-2 -ml-2">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src={logoNamzu} alt="NAMZU" className="w-20 h-20 object-contain" />
          <span className="font-extrabold text-primary tracking-tight text-4xl">NAMZU</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Entrar</h1>
        <p className="text-muted-foreground mb-8">Continue sua jornada de leitura</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-[52px] rounded-2xl mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-[52px] rounded-2xl mt-1" />
          </div>
          <Button type="submit" disabled={busy} className="h-[52px] rounded-2xl text-base font-semibold mt-2 bg-primary hover:bg-primary-hover">
            {busy ? "Entrando..." : "Entrar"}
          </Button>
          <Link to="/recuperar-senha" className="text-sm text-primary font-semibold text-center mt-1">
            Esqueci minha senha
          </Link>
        </form>
        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <GoogleButton label="Entrar com Google" returnTo={returnTo} />
        <p className="text-sm text-center mt-6 text-muted-foreground">
          Não tem conta? <Link to="/signup" className="text-primary font-semibold">Criar conta</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
