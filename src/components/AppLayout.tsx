import { ReactNode, useState } from "react";
import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { Home, Users, Search, BookOpen, BookMarked, Menu, User, Target, History, Bell, Settings, LogOut, Shield, FileText } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logoNamzu from "@/assets/logo-namzu.png";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { useNotificacoesTotal } from "@/hooks/useNotificacoesTotal";
import { useConquistaRealtime } from "@/hooks/useConquistaRealtime";


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
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
  { to: "/termos", icon: FileText, label: "Termos e Privacidade" },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { flags } = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const totalNotificacoes = useNotificacoesTotal();
  useConquistaRealtime(); // Realtime: toast ao desbloquear conquista

  const visibleNav = navItems.filter((i) => {
    if (isAdmin) return true;
    if (!flags.pages_global_visible) return false; // override global
    if (i.to === "/clubes") return flags.show_clubes;
    if (i.to === "/leituras") return flags.show_leituras;
    return true;
  });

  const showMenuInferior = (() => {
    if (isAdmin) return true;
    const p = location.pathname;
    if (p === "/") return flags.show_menu_inferior_home;
    if (p.startsWith("/clubes")) return flags.show_menu_inferior_clubes;
    if (p.startsWith("/busca")) return flags.show_menu_inferior_busca;
    if (p.startsWith("/livros") || p.startsWith("/obra") || p.startsWith("/autor")) return flags.show_menu_inferior_livros;
    if (p.startsWith("/leituras")) return flags.show_menu_inferior_leituras;
    if (p.startsWith("/perfil") || p.startsWith("/perfis")) return flags.show_menu_inferior_perfil;
    return true;
  })();
  const visibleDrawer = drawerItems.filter((i) => {
    if (isAdmin) return true;
    if (i.to === "/metas") return flags.show_metas;
    if (i.to === "/historico") return flags.show_historico;
    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/onboarding");
  };

  const avatarUrl = (user?.user_metadata?.avatar_url as string) || (user?.user_metadata?.picture as string) || "";
  const fullName = (user?.user_metadata?.full_name as string) || user?.email || "U";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="relative min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-paper border-b border-border/60 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 h-14">
          <Link to="/" className="flex items-center gap-2 hover-lift" aria-label="Ir para Início">
            <img src={logoNamzu} alt="NAMZU" className="w-8 h-8 object-contain" />
            <span className="font-extrabold text-primary tracking-tight text-lg">NAMZU</span>
          </Link>
          <span className="hidden md:inline text-sm text-muted-foreground">A sabedoria começa aqui !!!</span>
          <div className="ml-auto flex items-center gap-2">
            <InstallPWAButton />

            {/* Sino de notificações */}
            <Link
              to="/notificacoes"
              aria-label="Ver notificações"
              className="flex items-center gap-1 hover-lift p-1.5 rounded-xl text-accent hover:text-primary transition-colors"
            >
              <Bell className="w-5 h-5" />
              {totalNotificacoes > 0 && (
                <span className="text-xs font-bold text-destructive leading-none">
                  {totalNotificacoes > 10 ? "+10" : totalNotificacoes}
                </span>
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hover-lift rounded-full focus:outline-none" aria-label="Menu do usuário">
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={avatarUrl} alt={fullName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate("/perfil")}>
                  <User className="w-4 h-4 mr-2" />
                  Ver perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className={`relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 pt-20 animate-fade-in ${showMenuInferior ? "pb-24" : "pb-4"}`}>
        {children}
      </main>

      {showMenuInferior && <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-paper border-t border-border/60 shadow-elevated">
        <div
          className="max-w-3xl mx-auto grid px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${visibleNav.length + 1}, minmax(0, 1fr))` }}
        >
          {visibleNav.map((item) => (
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
      </nav>}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle className="text-left">NAMZU</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-1">
            {[...visibleDrawer, ...(isAdmin ? [{ to: "/admin", icon: Shield, label: "Admin" }] : [])].map((item) => (
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
