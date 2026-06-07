import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { LogOut, Settings2, FileText, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";

const Configuracoes = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/onboarding");
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={Settings2}
        badge="Ajustes"
        title={<>Configura<span className="text-gradient-warm">ções</span></>}
        description="Personalize sua experiência no NAMZU."
      />
      <div className="card-soft p-4">
        <p className="text-xs text-muted-foreground">Conta</p>
        <p className="font-semibold mt-1">{user?.email}</p>
      </div>
      <div className="card-soft p-4 flex flex-col gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Aparência</p>
          <p className="font-semibold mt-1">Tema</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="card-soft p-4 flex flex-col gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Acessibilidade</p>
          <p className="font-semibold mt-1">Tamanho do texto</p>
          <p className="text-xs text-muted-foreground mt-0.5">P (pequeno), M (médio) ou G (grande)</p>
        </div>
        <FontSizeToggle />
      </div>
      <Button onClick={handleSignOut} variant="outline" className="h-[52px] rounded-2xl border-2 text-destructive border-destructive/30 hover:bg-destructive/10">
        <LogOut className="w-4 h-4" /> Sair da conta
      </Button>
    </div>
  );
};

export default Configuracoes;
