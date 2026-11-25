import { NavLink, useNavigate } from "react-router-dom";
import { BookMarked, Library, Plus, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";

// Abas do destino "Minha leitura" (Fase 2): reúnem o que antes eram três
// itens de menu separados e deixam "Adicionar livro" sempre à mão.
export const AbasMinhaLeitura = () => {
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();

  const abas = [
    { to: "/leituras", label: "Lendo", icon: BookMarked, visivel: isAdmin || flags.show_leituras },
    { to: "/livros", label: "Estante", icon: Library, visivel: isAdmin || flags.show_livros },
    { to: "/citacoes", label: "Citações", icon: Quote, visivel: isAdmin || flags.show_citacoes },
  ].filter((a) => a.visivel);

  const podeAdicionar = isAdmin || flags.show_busca;

  return (
    <div className="flex items-center gap-2 mb-4">
      <nav aria-label="Minha leitura" className="flex flex-1 gap-1 rounded-2xl bg-muted p-1 min-w-0">
        {abas.map((aba) => (
          <NavLink
            key={aba.to}
            to={aba.to}
            end
            className={({ isActive }) =>
              cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                isActive ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <aba.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{aba.label}</span>
          </NavLink>
        ))}
      </nav>
      {podeAdicionar && (
        <Button
          size="sm"
          onClick={() => navigate("/busca")}
          className="h-10 rounded-2xl gap-1 bg-primary hover:bg-primary-hover shrink-0"
          aria-label="Adicionar livro"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar livro</span>
        </Button>
      )}
    </div>
  );
};
