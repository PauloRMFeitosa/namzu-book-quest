import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import logoNamzu from "@/assets/logo-namzu.png";

const RecuperarSenha = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Código enviado! Confira seu email.");
    setStep("verify");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error("Digite o código de 6 dígitos");
    if (password.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");

    setBusy(true);
    const { error: vErr } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });
    if (vErr) {
      setBusy(false);
      return toast.error("Código inválido ou expirado");
    }
    const { error: uErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (uErr) return toast.error(uErr.message);
    toast.success("Senha redefinida com sucesso!");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button
        onClick={() => (step === "verify" ? setStep("request") : navigate("/login"))}
        className="self-start text-muted-foreground p-2 -ml-2"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        {step === "request" ? (
          <>
            <h1 className="text-3xl font-bold mb-2">Esqueci minha senha</h1>
            <p className="text-muted-foreground mb-8">
              Informe seu email e enviaremos um código de 6 dígitos para redefinir sua senha.
            </p>
            <form onSubmit={handleRequest} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[52px] rounded-2xl mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-[52px] rounded-2xl text-base font-semibold mt-2 bg-primary hover:bg-primary-hover"
              >
                {busy ? "Enviando..." : "Enviar código"}
              </Button>
            </form>
            <p className="text-sm text-center mt-6 text-muted-foreground">
              Lembrou a senha?{" "}
              <Link to="/login" className="text-primary font-semibold">
                Entrar
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2">Redefinir senha</h1>
            <p className="text-muted-foreground mb-8">
              Digite o código enviado para <span className="font-medium text-foreground">{email}</span> e crie uma nova senha.
            </p>
            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <div>
                <Label>Código de verificação</Label>
                <div className="mt-2 flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div>
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[52px] rounded-2xl mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-[52px] rounded-2xl mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-[52px] rounded-2xl text-base font-semibold mt-2 bg-primary hover:bg-primary-hover"
              >
                {busy ? "Redefinindo..." : "Redefinir senha"}
              </Button>
              <button
                type="button"
                onClick={handleRequest}
                disabled={busy}
                className="text-sm text-primary font-semibold mt-1"
              >
                Reenviar código
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RecuperarSenha;
