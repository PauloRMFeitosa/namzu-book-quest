import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate("/onboarding")} className="self-start text-muted-foreground p-2 -ml-2">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
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
        <p className="text-sm text-center mt-6 text-muted-foreground">
          Não tem conta? <Link to="/signup" className="text-primary font-semibold">Criar conta</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
