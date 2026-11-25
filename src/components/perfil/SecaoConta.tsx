import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Compass, Eye, FileText, History, LogOut, Settings, Shield, Target } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useVerComoMembro } from "@/stores/verComoMembroStore";
import { destinoAoSair } from "@/lib/navegacao";

// Seção "Conta" do Perfil (Fase 2): substitui o menu "Mais" quando a
// navegação de três destinos está ligada.
export const SecaoConta = () => {
  const { signOut } = useAuth();
  const { flags } = useFeatureFlags();
  const { isAdmin, adminReal } = useIsAdmin();
  const verComoMembro = useVerComoMembro((s) => s.ativo);
  const definirVerComoMembro = useVerComoMembro((s) => s.definir);
  const navigate = useNavigate();

  const itens = [
    { to: "/configuracoes", icon: Settings, label: "Configurações", visivel: true },
    { to: "/clubes", icon: Compass, label: "Explorar clubes", visivel: isAdmin || flags.show_clubes },
    { to: "/metas", icon: Target, label: "Metas", visivel: isAdmin || flags.show_metas },
    { to: "/historico", icon: History, label: "Histórico", visivel: isAdmin || flags.show_historico },
    { to: "/termos", icon: FileText, label: "Termos e Privacidade", visivel: true },
    { to: "/admin", icon: Shield, label: "Admin", visivel: isAdmin },
  ].filter((i) => i.visivel);

  const sair = async () => {
    const destino = destinoAoSair(flags);
    await signOut();
    navigate(destino);
  };

  return (
    <section className="card-soft p-2" aria-label="Conta">
      <h3 className="px-3 pt-3 pb-1 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Conta</h3>
      <div className="flex flex-col">
        {itens.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <item.icon className="w-5 h-5 text-primary" />
            <span className="flex-1 text-sm">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}

        {adminReal && (
          <div className="flex items-center gap-3 px-3 py-3">
            <Eye className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <Label htmlFor="ver-como-membro" className="text-sm font-normal">Ver como membro</Label>
              <p className="text-xs text-muted-foreground">
                Mostra o app como um usuário comum vê, respeitando as flags. Só muda a interface deste aparelho.
              </p>
            </div>
            <Switch id="ver-como-membro" checked={verComoMembro} onCheckedChange={definirVerComoMembro} />
          </div>
        )}

        <button
          onClick={sair}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-left"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </section>
  );
};
