import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Users, Search, BookOpen, BookMarked, Menu, User, Target, History, Bell, Settings, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logoNamzu from "@/assets/logo-namzu.png";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/clubes", icon: Users, label: "Clubes" },
  { to: "/busca", icon: Search, label: "Busca" },
  { to: "/livros", icon: BookOpen, label: "Livros" },
  { to: "/leituras", icon: BookMarked, label: "Leituras" },
];

const drawerItems = [
  { to: "/perfil", icon: User, label: "Perfil" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/historico", icon: History, label: "Histórico" },
  { to: "/notificacoes", icon: Bell, label: "Notificações" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 h-14">
          <img src={logoNamzu} alt="NAMZU" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-extrabold text-primary tracking-tight text-lg">NAMZU</span>
          <span className="hidden md:inline text-sm text-muted-foreground">A sabedoria começa aqui !!!</span>
        </div>
      </header>

      <main className="flex-1 pb-24 max-w-3xl w-full mx-auto px-4 pt-20 animate-fade-in">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-elevated">
        <div className="max-w-3xl mx-auto grid grid-cols-6 px-2 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all",
                  isActive ? "text-primary" : "text-accent hover:text-primary"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1.5 text-accent hover:text-primary transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle className="text-left">NAMZU</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-1">
            {drawerItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
                    isActive ? "bg-secondary text-primary font-semibold" : "hover:bg-muted"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
