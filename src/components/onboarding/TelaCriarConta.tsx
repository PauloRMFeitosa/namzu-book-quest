import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleButton } from "@/components/GoogleButton";
import { executarMergeOnboarding } from "@/services/onboardingMerge";
import { temDadosDeOnboarding } from "@/stores/onboardingStore";
import { trackOnboarding } from "@/services/analyticsOnboarding";
import logoNamzu from "@/assets/logo-namzu.png";

type Vista = "cadastro" | "login";

interface Props {
  returnTo?: string;
}

export function TelaCriarConta({ returnTo = "/" }: Props) {
  const navigate = useNavigate();
  const [vista, setVista] = useState<Vista>("cadastro");

  // Cadastro
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [termosAceitos, setTermosAceitos] = useState(false);

  // Login
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");

  const [busy, setBusy] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: nome },
      },
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (data.user) {
      await supabase.rpc("aceitar_termos");
      if (data.session && temDadosDeOnboarding()) {
        try { await executarMergeOnboarding(data.user.id); } catch {}
      }
    }
    setBusy(false);
    trackOnboarding("onboarding_signup_concluido", { metodo_signup: "email" });
    toast.success("Conta criada! Bem-vindo ao NAMZU.");
    navigate(returnTo, { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: senhaLogin,
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (data.user && temDadosDeOnboarding()) {
      try { await executarMergeOnboarding(data.user.id); } catch {}
    }
    setBusy(false);
    navigate(returnTo, { replace: true });
  };

  if (vista === "login") {
    return (
      <div className="relative z-10 min-h-screen flex flex-col px-6 py-8">
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <div className="flex flex-col items-center gap-2 mb-6">
            <img src={logoNamzu} alt="NAMZU" className="w-20 h-20 object-contain" />
            <span className="font-extrabold text-primary tracking-tight text-4xl">NAMZU</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Entrar</h1>
          <p className="text-muted-foreground mb-8">Continue sua jornada de leitura</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                required
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                className="h-[52px] rounded-2xl mt-1"
              />
            </div>
            <div>
              <Label htmlFor="login-senha">Senha</Label>
              <Input
                id="login-senha"
                type="password"
                required
                value={senhaLogin}
                onChange={(e) => setSenhaLogin(e.target.value)}
                className="h-[52px] rounded-2xl mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-[52px] rounded-2xl text-base font-semibold mt-2 bg-primary hover:bg-primary-hover"
            >
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
            Não tem conta?{" "}
            <button onClick={() => setVista("cadastro")} className="text-primary font-semibold">
              Criar conta
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen flex flex-col px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src={logoNamzu} alt="NAMZU" className="w-20 h-20 object-contain" />
          <span className="font-extrabold text-primary tracking-tight text-4xl">NAMZU</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Criar conta</h1>
        <p className="text-muted-foreground mb-8">Sua estante está pronta — salve para não perder.</p>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="cc-nome">Nome</Label>
            <Input
              id="cc-nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-[52px] rounded-2xl mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cc-email">Email</Label>
            <Input
              id="cc-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[52px] rounded-2xl mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cc-senha">Senha</Label>
            <Input
              id="cc-senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-[52px] rounded-2xl mt-1"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termosAceitos}
              onChange={(e) => setTermosAceitos(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              Li e concordo com os{" "}
              <Link to="/termos" target="_blank" className="text-primary underline underline-offset-2">
                Termos de Uso e Política de Privacidade
              </Link>
            </span>
          </label>
          <Button
            type="submit"
            disabled={busy || !termosAceitos}
            className="h-[52px] rounded-2xl text-base font-semibold mt-2 bg-primary hover:bg-primary-hover"
          >
            {busy ? "Criando..." : "Criar conta"}
          </Button>
        </form>
        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <GoogleButton label="Cadastrar com Google" returnTo={returnTo} />
        <p className="text-sm text-center mt-6 text-muted-foreground">
          Já tem conta?{" "}
          <button onClick={() => setVista("login")} className="text-primary font-semibold">
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
