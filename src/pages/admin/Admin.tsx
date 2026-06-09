import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Eye,
  Gamepad2,
  Users,
  BookOpen,
  User,
  Building2,
  Target,
  Trophy,
  HeartPulse,
  RefreshCw,
  Tags,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { GamificacaoTab } from "./tabs/GamificacaoTab";
import { UsuariosTab } from "./tabs/UsuariosTab";
import { LivrosTab } from "./tabs/LivrosTab";
import { AutoresTab } from "./tabs/AutoresTab";
import { ClubesTab } from "./tabs/ClubesTab";
import { MetasTab } from "./tabs/MetasTab";
import { ConquistasTab } from "./tabs/ConquistasTab";
import { VisibilidadeTab } from "./tabs/VisibilidadeTab";
import { SaudeCatalogoTab } from "./tabs/SaudeCatalogoTab";
import { ReprocessamentoTab } from "./tabs/ReprocessamentoTab";
import { MapeamentoGenerosTab } from "./tabs/MapeamentoGenerosTab";

type TabKey =
  | "visibilidade"
  | "gamificacao"
  | "usuarios"
  | "livros"
  | "autores"
  | "clubes"
  | "metas"
  | "conquistas"
  | "saude"
  | "reprocessamento"
  | "mapeamento-generos";

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const CONTENT_NAV: NavItem[] = [
  { key: "livros", label: "Livros", icon: BookOpen },
  { key: "autores", label: "Autores", icon: User },
  { key: "clubes", label: "Clubes", icon: Building2 },
];

const PLATFORM_NAV: NavItem[] = [
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "gamificacao", label: "Gamificação", icon: Gamepad2 },
  { key: "metas", label: "Metas", icon: Target },
  { key: "conquistas", label: "Conquistas", icon: Trophy },
  { key: "visibilidade", label: "Visibilidade", icon: Eye },
];

const TOOLS_NAV: NavItem[] = [
  { key: "saude", label: "Saúde do Catálogo", icon: HeartPulse },
  { key: "reprocessamento", label: "Reprocessamento", icon: RefreshCw },
  { key: "mapeamento-generos", label: "Mapeamento de Gêneros", icon: Tags },
];

interface Metrics {
  users: number;
  books: number;
  clubs: number;
  activeToday: number;
}

const Admin = () => {
  const [tab, setTab] = useState<TabKey>("visibilidade");
  const [metrics, setMetrics] = useState<Metrics>({ users: 0, books: 0, clubs: 0, activeToday: 0 });

  // Sidebar: expanded by default on lg+ (≥1024px), collapsed on smaller screens.
  // State persists in localStorage so user preference is remembered.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("admin-sidebar-collapsed");
      if (saved !== null) return JSON.parse(saved) as boolean;
    } catch { /* ignore */ }
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  useEffect(() => {
    const loadMetrics = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: books }, { count: clubs }, { count: activeToday }] = await Promise.all([
        (supabase as any).from("obras").select("*", { count: "exact", head: true }),
        (supabase as any).from("clubes").select("*", { count: "exact", head: true }).eq("is_ativo", true),
        (supabase as any)
          .from("gamificacao_perfis")
          .select("*", { count: "exact", head: true })
          .gte("updated_at", today),
      ]);
      let users = 0;
      try {
        const { data } = await supabase.functions.invoke("admin-list-users");
        users = (data as any)?.users?.length ?? 0;
      } catch { /* ignore */ }

      setMetrics({
        users,
        books: books ?? 0,
        clubs: clubs ?? 0,
        activeToday: activeToday ?? 0,
      });
    };
    loadMetrics();
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const METRICS = [
    { label: "Usuários", value: metrics.users, icon: Users },
    { label: "Livros", value: metrics.books, icon: BookOpen },
    { label: "Clubes ativos", value: metrics.clubs, icon: Building2 },
    { label: "Ativos hoje", value: metrics.activeToday, icon: Gamepad2 },
  ];

  const allNav = [...CONTENT_NAV, ...PLATFORM_NAV, ...TOOLS_NAV];
  const currentNav = allNav.find((n) => n.key === tab);

  // NavGroup renders differently based on collapsed state:
  // - Expanded: group label + icon + text button
  // - Collapsed: icon-only buttons + horizontal divider between groups
  const NavGroup = ({ label, items, isLast }: { label: string; items: NavItem[]; isLast?: boolean }) => (
    <>
      {!collapsed && (
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      )}
      {items.map(({ key, label: itemLabel, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          title={collapsed ? itemLabel : undefined}
          className={cn(
            "flex items-center rounded-md transition-colors text-left w-full",
            collapsed ? "justify-center px-1 py-2" : "gap-2 px-2 py-1.5 text-sm",
            tab === key
              ? "bg-secondary font-medium text-foreground"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && itemLabel}
        </button>
      ))}
      {collapsed && !isLast && <div className="h-px bg-border mx-1 my-2" />}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-primary">Administração</h1>
        <p className="text-sm text-muted-foreground">Gestão completa do NAMZU</p>
      </header>

      {/* Metrics — 2×2 on mobile, 4×1 on sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg bg-muted/60 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-semibold">{value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      {/* Sidebar + Content */}
      <div className="flex gap-6">
        {/* Sidebar — visible on sm+, collapses to icon-only when collapsed=true */}
        <nav
          className={cn(
            "hidden sm:flex flex-col shrink-0 gap-0.5 transition-[width] duration-200",
            collapsed ? "w-10" : "w-44"
          )}
        >
          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground",
              "hover:bg-secondary/50 hover:text-foreground transition-colors mb-1",
              collapsed ? "self-center" : "self-end"
            )}
          >
            {collapsed
              ? <PanelLeftOpen className="h-3.5 w-3.5" />
              : <PanelLeftClose className="h-3.5 w-3.5" />}
          </button>

          <NavGroup label="Conteúdo" items={CONTENT_NAV} />
          <div className={collapsed ? "" : "pt-3"}>
            <NavGroup label="Plataforma" items={PLATFORM_NAV} />
          </div>
          <div className={collapsed ? "" : "pt-3"}>
            <NavGroup label="Ferramentas" items={TOOLS_NAV} isLast />
          </div>
        </nav>

        {/* Mobile nav — horizontal scroll */}
        <div className="sm:hidden w-full overflow-x-auto pb-2">
          <div className="flex gap-1 w-max">
            {allNav.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  tab === key
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel — max-w prevents excessive stretch on ultra-wide screens */}
        <div className="flex-1 min-w-0 max-w-screen-xl">
          {currentNav && (
            <div className="hidden sm:flex items-center gap-2 mb-4 pb-3 border-b">
              <currentNav.icon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{currentNav.label}</h2>
            </div>
          )}

          {tab === "visibilidade" && <VisibilidadeTab />}
          {tab === "gamificacao" && <GamificacaoTab />}
          {tab === "usuarios" && <UsuariosTab />}
          {tab === "livros" && <LivrosTab />}
          {tab === "autores" && <AutoresTab />}
          {tab === "clubes" && <ClubesTab />}
          {tab === "metas" && <MetasTab />}
          {tab === "conquistas" && <ConquistasTab />}
          {tab === "saude" && <SaudeCatalogoTab />}
          {tab === "reprocessamento" && <ReprocessamentoTab />}
          {tab === "mapeamento-generos" && <MapeamentoGenerosTab />}
        </div>
      </div>
    </div>
  );
};

export default Admin;
