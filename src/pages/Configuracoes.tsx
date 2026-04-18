import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Configuracoes = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/onboarding");
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <div className="card-soft p-4">
        <p className="text-xs text-muted-foreground">Conta</p>
        <p className="font-semibold mt-1">{user?.email}</p>
      </div>
      <Button onClick={handleSignOut} variant="outline" className="h-[52px] rounded-2xl border-2 text-destructive border-destructive/30 hover:bg-destructive/10">
        <LogOut className="w-4 h-4" /> Sair da conta
      </Button>
    </div>
  );
};

export default Configuracoes;
