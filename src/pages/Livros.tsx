import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { BookOpen, Plus, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Filtro = "todos" | "lendo" | "quero_ler" | "lido" | "relendo";

const Livros = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const { data = [] } = useQuery({
    queryKey: ["meus-livros", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: livros } = await supabase
        .from("usuario_livros")
        .select("id, status, obra_id, obras(*)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      const list = livros ?? [];
      const ids = list.map((l: any) => l.id);
      let lendoIds = new Set<string>();
      let concluidoIds = new Set<string>();
      if (ids.length) {
        const { data: exps } = await supabase
          .from("usuario_leituras")
          .select("usuario_livro_id, status")
          .in("usuario_livro_id", ids);
        for (const e of exps ?? []) {
          if (e.status === "lendo") lendoIds.add(e.usuario_livro_id);
          if (e.status === "concluido") concluidoIds.add(e.usuario_livro_id);
        }
      }
      return list.map((l: any) => ({
        ...l,
        statusEfetivo:
          l.status === "relendo"
            ? "relendo"
            : lendoIds.has(l.id)
            ? "lendo"
            : l.status === "lido" || l.status === "concluido" || concluidoIds.has(l.id)
            ? "lido"
            : l.status,
      }));
    },
  });

  const matchFiltro = (status: string, f: Filtro) => {
    if (f === "todos") return true;
    return status === f;
  };

  const counts = {
    todos: data.length,
    lendo: data.filter((l: any) => matchFiltro(l.statusEfetivo, "lendo")).length,
    quero_ler: data.filter((l: any) => matchFiltro(l.statusEfetivo, "quero_ler")).length,
    lido: data.filter((l: any) => matchFiltro(l.statusEfetivo, "lido")).length,
    relendo: data.filter((l: any) => matchFiltro(l.statusEfetivo, "relendo")).length,
  };

  const filtrados = data.filter((l: any) => matchFiltro(l.statusEfetivo, filtro));

  const chips: { key: Filtro; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "lendo", label: "Lendo" },
    { key: "relendo", label: "Relendo" },
    { key: "quero_ler", label: "Quero ler" },
    { key: "lido", label: "Lidos" },
  ];

  const Grid = ({ items }: { items: any[] }) =>
    items.length === 0 ? (
      <div className="text-center py-12">
        <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Nenhum livro nesta lista.</p>
        <Button onClick={() => navigate("/busca")} className="rounded-2xl bg-primary hover:bg-primary-hover">
          <Plus className="w-4 h-4" /> Adicionar livro
        </Button>
      </div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
        {items.map((l: any) => (
          <button key={l.id} onClick={() => navigate(`/obras/${l.obra_id}`)} className="text-left hover-lift">
            {l.obras?.capa_padrao_url ? (
              <img src={l.obras.capa_padrao_url} alt="" className="w-full aspect-[2/3] rounded-xl object-cover shadow-soft" />
            ) : (
              <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            )}
            <p className="text-sm font-medium mt-2 line-clamp-2 break-words min-h-[2.5rem]">{l.obras?.titulo_original}</p>
          </button>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={Library}
        badge="Biblioteca"
        title={<>Meus <span className="text-gradient-warm">livros</span></>}
        description="Sua coleção organizada por status."
      />
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {chips.map((c) => {
          const ativo = filtro === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFiltro(c.key)}
              className={cn(
                "rounded-full px-4 h-9 text-sm font-medium whitespace-nowrap transition-colors",
                ativo
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              {c.label} ({counts[c.key]})
            </button>
          );
        })}
      </div>
      <Grid items={filtrados} />
    </div>
  );
};

export default Livros;
