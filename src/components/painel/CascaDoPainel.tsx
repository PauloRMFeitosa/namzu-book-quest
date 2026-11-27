import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Moldura das áreas de gestão (Admin e painel do organizador): tela inteira,
// fora do layout do app, com menu lateral fixo no computador e em gaveta no
// celular, e o conteúdo em largura total.

export interface SecaoDoPainel {
  chave: string;
  rotulo: string;
  descricao: string;
  icone: LucideIcon;
  /** Número pequeno ao lado do nome, para pendências. Zero ou ausente não aparece. */
  aviso?: number;
}

export interface GrupoDoPainel {
  rotulo: string;
  /** Grupo que começa fechado. */
  recolhido?: boolean;
  secoes: SecaoDoPainel[];
}

interface Props {
  /** Nome no topo do menu, ex.: "NAMZU". */
  marca: string;
  /** Complemento da marca, ex.: "Admin". */
  area: string;
  /** Nome do menu para leitor de tela, ex.: "Seções do Admin". */
  rotuloDoMenu: string;
  grupos: GrupoDoPainel[];
  atual: SecaoDoPainel;
  onIrPara: (chave: string) => void;
  voltar: { para: string; rotulo: string; rotuloCurto: string };
  /** Chave do localStorage que guarda se o menu está recolhido. */
  chaveDoMenu: string;
  /** Conteúdo extra no topo do menu, abaixo da marca (ex.: seletor de clube). */
  topoDoMenu?: ReactNode;
  children: ReactNode;
}

export const CascaDoPainel = ({
  marca,
  area,
  rotuloDoMenu,
  grupos,
  atual,
  onIrPara,
  voltar,
  chaveDoMenu,
  topoDoMenu,
  children,
}: Props) => {
  const [menuNoCelular, setMenuNoCelular] = useState(false);
  const [estreito, setEstreito] = useState<boolean>(() => {
    try {
      return localStorage.getItem(chaveDoMenu) === "true";
    } catch {
      return false;
    }
  });
  const grupoDaAtual = grupos.find((g) => g.secoes.some((s) => s.chave === atual.chave));
  const [recolhidosAbertos, setRecolhidosAbertos] = useState(!!grupoDaAtual?.recolhido);

  const irPara = (chave: string) => {
    onIrPara(chave);
    setMenuNoCelular(false);
  };

  const alternarMenu = () =>
    setEstreito((antes) => {
      try {
        localStorage.setItem(chaveDoMenu, String(!antes));
      } catch {
        // sem armazenamento: vale só nesta visita
      }
      return !antes;
    });

  const menu = (curto: boolean) => (
    <nav aria-label={rotuloDoMenu} className="flex flex-col gap-4 p-3">
      {grupos.map((grupo) => {
        const aberto = !grupo.recolhido || recolhidosAbertos;
        return (
          <div key={grupo.rotulo} className="flex flex-col gap-0.5">
            {curto ? (
              <div className="h-px bg-border mx-1 my-1" />
            ) : grupo.recolhido ? (
              <button
                type="button"
                aria-expanded={aberto}
                onClick={() => setRecolhidosAbertos((v) => !v)}
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
                const temAviso = !!s.aviso && s.aviso > 0;
                return (
                  <button
                    key={s.chave}
                    type="button"
                    onClick={() => irPara(s.chave)}
                    aria-current={ativa ? "page" : undefined}
                    title={curto ? s.rotulo : undefined}
                    className={cn(
                      "relative flex items-center rounded-lg text-sm text-left transition-colors",
                      curto ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-2.5 py-2",
                      ativa ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <s.icone className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {curto ? <span className="sr-only">{s.rotulo}</span> : <span className="truncate flex-1">{s.rotulo}</span>}
                    {temAviso && (
                      <span
                        className={cn(
                          "rounded-full text-[11px] font-semibold tabular-nums leading-none",
                          curto ? "absolute top-1 right-1 h-2 w-2 bg-amber-500 text-transparent" : "px-1.5 py-1",
                          !curto && (ativa ? "bg-primary-foreground/20 text-primary-foreground" : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"),
                        )}
                        aria-label={`${s.aviso} ${s.aviso === 1 ? "pendência" : "pendências"}`}
                      >
                        {curto ? "" : s.aviso}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        );
      })}
    </nav>
  );

  const titulo = (
    <span className="font-display text-lg font-semibold">
      {marca} <span className="text-muted-foreground font-normal text-sm">{area}</span>
    </span>
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
          {!estreito && titulo}
          <button
            type="button"
            onClick={alternarMenu}
            aria-label={estreito ? "Abrir o menu" : "Recolher o menu"}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {estreito ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
        {topoDoMenu && !estreito && <div className="p-3 pb-0">{topoDoMenu}</div>}
        <div className="flex-1 overflow-y-auto">{menu(estreito)}</div>
        <Link
          to={voltar.para}
          className={cn(
            "flex items-center gap-2 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted shrink-0",
            estreito ? "justify-center h-12" : "px-4 h-12",
          )}
          title={estreito ? voltar.rotulo : undefined}
        >
          <ArrowLeft className="w-4 h-4" /> {!estreito && voltar.rotulo}
        </Link>
      </aside>

      {/* Menu em gaveta, no celular */}
      <Sheet open={menuNoCelular} onOpenChange={setMenuNoCelular}>
        <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
          <SheetTitle className="h-14 flex items-center px-4 border-b border-border">{titulo}</SheetTitle>
          {topoDoMenu && <div className="p-3 pb-0">{topoDoMenu}</div>}
          {menu(false)}
          <Link to={voltar.para} className="flex items-center gap-2 border-t border-border px-4 h-12 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> {voltar.rotulo}
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
          <Link to={voltar.para} className="lg:hidden text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 shrink-0">
            <ArrowLeft className="w-4 h-4" /> {voltar.rotuloCurto}
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
};
