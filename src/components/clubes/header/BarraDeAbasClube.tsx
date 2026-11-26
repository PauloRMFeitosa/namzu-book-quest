import {
  BookOpen,
  CalendarDays,
  Hash,
  LayoutDashboard,
  Library,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dividirAbas } from "@/lib/abasClube";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  visao: LayoutDashboard,
  feed: MessageSquare,
  leituras: BookOpen,
  canais: Hash,
  eventos: CalendarDays,
  membros: Users,
  conteudos: Library,
  microgrupos: UsersRound,
  gestao: Settings,
};

// Ícone em cima e nome embaixo no celular; lado a lado em tela larga.
const ITEM =
  "flex-1 min-w-0 h-auto flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl px-0.5 sm:px-3 py-2 " +
  "text-[10px] sm:text-sm font-medium leading-tight text-muted-foreground transition-colors " +
  "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ITEM_ATIVO = "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground";

interface Props {
  abas: { value: string; label: string }[];
  ativa: string;
  onEscolher: (aba: string) => void;
}

/**
 * Menu da página do clube. Fica preso no topo ao rolar. Até seis abas cabem
 * na barra; passando disso, as menos usadas vão para o botão "Mais"
 * (regra em src/lib/abasClube.ts).
 */
export const BarraDeAbasClube = ({ abas, ativa, onEscolher }: Props) => {
  const { naBarra, emMais } = dividirAbas(abas);
  const ativaEmMais = emMais.find((a) => a.value === ativa);
  const IconeDeMais = ativaEmMais ? (ICONES[ativaEmMais.value] ?? MoreHorizontal) : MoreHorizontal;

  return (
    <div className="sticky top-16 z-20 -mx-1">
      <TabsList
        aria-label="Seções do clube"
        className="w-full h-auto flex items-stretch gap-0.5 sm:gap-1 rounded-2xl border border-border bg-card p-1 shadow-soft"
      >
        {naBarra.map((aba) => {
          const Icone = ICONES[aba.value] ?? BookOpen;
          return (
            <TabsTrigger
              key={aba.value}
              value={aba.value}
              className={cn(
                ITEM,
                "whitespace-normal data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary",
              )}
            >
              <Icone className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
              <span className="text-center sm:whitespace-nowrap">{aba.label}</span>
            </TabsTrigger>
          );
        })}

        {emMais.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(ITEM, ativaEmMais && ITEM_ATIVO)}
              aria-label={ativaEmMais ? `Mais seções. Aberta: ${ativaEmMais.label}` : "Mais seções"}
            >
              <IconeDeMais className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
              <span className="text-center sm:whitespace-nowrap">{ativaEmMais ? ativaEmMais.label : "Mais"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48 rounded-xl">
              {emMais.map((aba) => {
                const Icone = ICONES[aba.value] ?? BookOpen;
                const escolhida = aba.value === ativa;
                return (
                  <DropdownMenuItem
                    key={aba.value}
                    onSelect={() => onEscolher(aba.value)}
                    aria-current={escolhida ? "page" : undefined}
                    className={cn("gap-2 py-2.5 text-sm", escolhida && "font-semibold text-primary")}
                  >
                    <Icone className="w-4 h-4" aria-hidden="true" /> {aba.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TabsList>
    </div>
  );
};
