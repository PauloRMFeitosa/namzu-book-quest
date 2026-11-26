import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Bug,
  Building2,
  ChevronDown,
  ClipboardList,
  Eye,
  Flag,
  Gamepad2,
  Globe,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Tags,
  Target,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AutoresTab } from "./tabs/AutoresTab";
import { ClubesTab } from "./tabs/ClubesTab";
import { ConquistasTab } from "./tabs/ConquistasTab";
import { DenunciasTab } from "./tabs/DenunciasTab";
import { ErrosAppTab } from "./tabs/ErrosAppTab";
import { GamificacaoTab } from "./tabs/GamificacaoTab";
import { JobsTab } from "./tabs/JobsTab";
import { LivrosTab } from "./tabs/LivrosTab";
import { MapeamentoGenerosTab } from "./tabs/MapeamentoGenerosTab";
import { MetasTab } from "./tabs/MetasTab";
import { MetricasTab } from "./tabs/MetricasTab";
import { PainelTab } from "./tabs/PainelTab";
import { ReprocessamentoTab } from "./tabs/ReprocessamentoTab";
import { SaudeCatalogoTab } from "./tabs/SaudeCatalogoTab";
import { UsuariosTab } from "./tabs/UsuariosTab";
import { VisibilidadeTab } from "./tabs/VisibilidadeTab";
import { WikidataAutoresTab } from "./tabs/WikidataAutoresTab";
import { WikidataObrasTab } from "./tabs/WikidataObrasTab";

// Admin do NAMZU. Tem tela própria, fora do layout do app: menu lateral fixo,
// conteúdo em largura total. A seção aberta fica na URL (?secao=), para dar
// para voltar e compartilhar o endereço.

interface Secao {
  chave: string;
  rotulo: string;
  descricao: string;
  icone: LucideIcon;
}

interface Grupo {
  rotulo: string;
  /** Grupo que começa fechado: recursos desligados no app. */
  recolhido?: boolean;
  secoes: Secao[];
}

const GRUPOS: Grupo[] = [
  {
    rotulo: "Operação",
    secoes: [
      { chave: "painel", rotulo: "Painel", descricao: "O que está acontecendo no produto e o que pede atenção.", icone: LayoutDashboard },
      { chave: "metricas", rotulo: "Métricas", descricao: "Ações de organizadores e membros, por dia e por tipo.", icone: LineChart },
      { chave: "clubes", rotulo: "Clubes", descricao: "Situação, organizador e atividade de cada clube.", icone: Building2 },
      { chave: "usuarios", rotulo: "Usuários", descricao: "Contas, papéis e acesso.", icone: Users },
      { chave: "denuncias", rotulo: "Denúncias e sugestões", descricao: "O que os usuários reportaram pelo app.", icone: Flag },
      { chave: "erros-app", rotulo: "Erros do app", descricao: "Erros encontrados no navegador de quem estava logado.", icone: Bug },
    ],
  },
  {
    rotulo: "Catálogo",
    secoes: [
      { chave: "livros", rotulo: "Livros", descricao: "Obras e edições do acervo.", icone: BookOpen },
      { chave: "autores", rotulo: "Autores", descricao: "Autores do acervo.", icone: User },
      { chave: "saude", rotulo: "Saúde do catálogo", descricao: "Obras sem capa, sem autor ou sem gênero.", icone: HeartPulse },
      { chave: "wikidata-obras", rotulo: "Wikidata: obras", descricao: "Conferência de obras com o Wikidata.", icone: Globe },
      { chave: "wikidata-autores", rotulo: "Wikidata: autores", descricao: "Conferência de autores com o Wikidata.", icone: Globe },
      { chave: "reprocessamento", rotulo: "Reprocessamento", descricao: "Refazer autores e gêneros em lote.", icone: RefreshCw },
      { chave: "jobs", rotulo: "Integrações e logs", descricao: "Execuções das integrações do catálogo e registro de XP.", icone: ClipboardList },
    ],
  },
  {
    rotulo: "Configuração",
    secoes: [{ chave: "visibilidade", rotulo: "Visibilidade", descricao: "Liga e desliga recursos do app.", icone: Eye }],
  },
  {
    rotulo: "Recursos desligados",
    recolhido: true,
    secoes: [
      { chave: "gamificacao", rotulo: "Gamificação", descricao: "XP e conquistas dos usuários. A gamificação está desligada no app.", icone: Gamepad2 },
      { chave: "metas", rotulo: "Missões", descricao: "Missões da página de metas, que está desligada no app.", icone: Target },
      { chave: "conquistas", rotulo: "Conquistas", descricao: "Cadastro de conquistas. A gamificação está desligada no app.", icone: Trophy },
      { chave: "mapeamento-generos", rotulo: "Mapeamento de gêneros", descricao: "Liga interesses a gêneros, para o recurso de leitores parecidos, desligado no app.", icone: Tags },
    ],
  },
];

const TODAS = GRUPOS.flatMap((g) => g.secoes);
const CHAVE_MENU = "admin-sidebar-collapsed";

const Admin = () => {
  const [busca, setBusca] = useSearchParams();
  const pedida = busca.get("secao") ?? "painel";
  const atual = TODAS.find((s) => s.chave === pedida) ?? TODAS[0];
  const [menuNoCelular, setMenuNoCelular] = useState(false);
  const [estreito, setEstreito] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CHAVE_MENU) === "true";
    } catch {
      return false;
    }
  });
  const grupoDaAtual = GRUPOS.find((g) => g.secoes.some((s) => s.chave === atual.chave));
  const [desligadosAbertos, setDesligadosAbertos] = useState(!!grupoDaAtual?.recolhido);

  useEffect(() => {
    document.title = `${atual.rotulo} · Admin NAMZU`;
    window.scrollTo({ top: 0 });
    return () => {
      document.title = "Namzu";
    };
  }, [atual.chave, atual.rotulo]);

  const irPara = (chave: string) => {
    const proxima = new URLSearchParams(busca);
    proxima.set("secao", chave);
    setBusca(proxima);
    setMenuNoCelular(false);
  };

  const alternarMenu = () =>
    setEstreito((antes) => {
      try {
        localStorage.setItem(CHAVE_MENU, String(!antes));
      } catch {
        // sem armazenamento: vale só nesta visita
      }
      return !antes;
    });

  const menu = (curto: boolean) => (
    <nav aria-label="Seções do Admin" className="flex flex-col gap-4 p-3">
      {GRUPOS.map((grupo) => {
        const aberto = !grupo.recolhido || desligadosAbertos;
        return (
          <div key={grupo.rotulo} className="flex flex-col gap-0.5">
            {curto ? (
              <div className="h-px bg-border mx-1 my-1" />
            ) : grupo.recolhido ? (
              <button
                type="button"
                aria-expanded={aberto}
                onClick={() => setDesligadosAbertos((v) => !v)}
                className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {grupo.rotulo}
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", aberto && "rotate-180")} />
              </button>
            ) : (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{grupo.rotulo}</p>
            )}
            {aberto &&
              grupo.secoes.map((s) => {
                const ativa = s.chave === atual.chave;
                return (
                  <button
                    key={s.chave}
                    type="button"
                    onClick={() => irPara(s.chave)}
                    aria-current={ativa ? "page" : undefined}
                    title={curto ? s.rotulo : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm text-left transition-colors",
                      curto ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-2.5 py-2",
                      ativa ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <s.icone className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {!curto && <span className="truncate">{s.rotulo}</span>}
                    {curto && <span className="sr-only">{s.rotulo}</span>}
                  </button>
                );
              })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      {/* Menu lateral fixo, no computador */}
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-border bg-card transition-[width] duration-200",
          estreito ? "w-16" : "w-64",
        )}
      >
        <div className={cn("h-14 flex items-center border-b border-border shrink-0", estreito ? "justify-center" : "justify-between px-4")}>
          {!estreito && (
            <span className="font-display text-lg font-semibold">
              NAMZU <span className="text-muted-foreground font-normal text-sm">Admin</span>
            </span>
          )}
          <button
            type="button"
            onClick={alternarMenu}
            aria-label={estreito ? "Abrir o menu" : "Recolher o menu"}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {estreito ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{menu(estreito)}</div>
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted shrink-0",
            estreito ? "justify-center h-12" : "px-4 h-12",
          )}
          title={estreito ? "Voltar ao app" : undefined}
        >
          <ArrowLeft className="w-4 h-4" /> {!estreito && "Voltar ao app"}
        </Link>
      </aside>

      {/* Menu em gaveta, no celular */}
      <Sheet open={menuNoCelular} onOpenChange={setMenuNoCelular}>
        <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
          <SheetTitle className="h-14 flex items-center px-4 border-b border-border font-display text-lg">
            NAMZU <span className="text-muted-foreground font-normal text-sm ml-1.5">Admin</span>
          </SheetTitle>
          {menu(false)}
          <Link to="/" className="flex items-center gap-2 border-t border-border px-4 h-12 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar ao app
          </Link>
        </SheetContent>
      </Sheet>

      <div className={cn("flex flex-col min-h-screen transition-[padding] duration-200", estreito ? "lg:pl-16" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 h-14 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMenuNoCelular(true)}
            aria-label="Abrir o menu"
            className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-semibold leading-tight truncate">{atual.rotulo}</h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{atual.descricao}</p>
          </div>
          <Link to="/" className="lg:hidden text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 shrink-0">
            <ArrowLeft className="w-4 h-4" /> App
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6 min-w-0">
          {atual.chave === "painel" && <PainelTab onIrPara={irPara} />}
          {atual.chave === "metricas" && <MetricasTab />}
          {atual.chave === "clubes" && <ClubesTab />}
          {atual.chave === "usuarios" && <UsuariosTab />}
          {atual.chave === "denuncias" && <DenunciasTab />}
          {atual.chave === "erros-app" && <ErrosAppTab />}
          {atual.chave === "livros" && <LivrosTab />}
          {atual.chave === "autores" && <AutoresTab />}
          {atual.chave === "saude" && <SaudeCatalogoTab />}
          {atual.chave === "wikidata-obras" && <WikidataObrasTab />}
          {atual.chave === "wikidata-autores" && <WikidataAutoresTab />}
          {atual.chave === "reprocessamento" && <ReprocessamentoTab />}
          {atual.chave === "jobs" && <JobsTab />}
          {atual.chave === "visibilidade" && <VisibilidadeTab />}
          {atual.chave === "gamificacao" && <GamificacaoTab />}
          {atual.chave === "metas" && <MetasTab />}
          {atual.chave === "conquistas" && <ConquistasTab />}
          {atual.chave === "mapeamento-generos" && <MapeamentoGenerosTab />}
        </main>
      </div>
    </div>
  );
};

export default Admin;
