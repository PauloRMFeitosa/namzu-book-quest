import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleButton } from "@/components/GoogleButton";
import { executarMergeOnboarding } from "@/services/onboardingMerge";
import { temDadosDeOnboarding } from "@/stores/onboardingStore";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { trackOnboarding } from "@/services/analyticsOnboarding";

type Vista = "opcoes" | "email";

interface Props {
  returnTo?: string;
}

export function TelaCriarConta({ returnTo = "/" }: Props) {
  const navigate = useNavigate();
  const [vista, setVista] = useState<Vista>("opcoes");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="text-sm text-primary font-medium">Estante pronta</p>
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">
          Quer guardar sua estante?
        </h2>
        <p className="text-muted-foreground mb-8">
          Crie a conta pra não perder o que montamos.
        </p>

        {vista === "opcoes" ? (
          <div className="flex flex-col gap-3">
            <GoogleButton label="Cadastrar com Google" returnTo={returnTo} />
            <Button
              variant="outline"
              className="h-[52px] rounded-2xl text-base font-semibold"
              onClick={() => setVista("email")}
            >
              Cadastrar com e-mail
            </Button>
          </div>
        ) : (
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
              <Label htmlFor="cc-email">E-mail</Label>
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
            <Button
              type="submit"
              disabled={busy}
              className="h-[52px] rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90 mt-2"
            >
              {busy ? "Criando…" : "Criar conta"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVista("opcoes")}
              className="text-muted-foreground"
            >
              ← Voltar
            </Button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Ao criar a conta, você concorda com os{" "}
          <Link to="/termos" target="_blank" className="text-primary underline underline-offset-2">
            Termos de Uso
          </Link>
          .
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-semibold">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
