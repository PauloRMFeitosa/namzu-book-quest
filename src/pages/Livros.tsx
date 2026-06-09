import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { BookOpen, Plus, Library, Trash2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { invalidateLeituras } from "@/lib/queryInvalidation";

type Filtro = "todos" | "lendo" | "quero_ler" | "lido" | "relendo" | "favoritos";

const Livros = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [removerAlvo, setRemoverAlvo] = useState<{ id: string; titulo: string } | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [favoritando, setFavoritando] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["meus-livros", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: livros } = await supabase
        .from("usuario_livros")
        .select("id, status, favorito, obra_id, obras(*)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      const list = livros ?? [];
      let lendoIds = new Set<string>();
      let concluidoIds = new Set<string>();
      const { data: exps } = await supabase
        .from("usuario_leituras")
        .select("usuario_livro_id, status, usuario_livros!inner(user_id)")
        .eq("usuario_livros.user_id", user!.id);
      for (const e of exps ?? []) {
        if (e.status === "lendo") lendoIds.add((e as any).usuario_livro_id);
        if (e.status === "concluido") concluidoIds.add((e as any).usuario_livro_id);
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

  const confirmarRemocao = async () => {
    if (!removerAlvo) return;
    setRemovendo(true);
    const { error } = await supabase
      .from("usuario_livros")
      .delete()
      .eq("id", removerAlvo.id)
      .eq("user_id", user!.id);
    setRemovendo(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Livro removido da biblioteca");
    setRemoverAlvo(null);
    invalidateLeituras(qc);
  };

  const toggleFavorito = async (id: string, atual: boolean) => {
    setFavoritando(id);
    const { error } = await supabase
      .from("usuario_livros")
      .update({ favorito: !atual })
      .eq("id", id)
      .eq("user_id", user!.id);
    setFavoritando(null);
    if (error) {
      toast.error("Erro ao atualizar favorito");
      return;
    }
    qc.invalidateQueries({ queryKey: ["meus-livros", user?.id] });
  };

  const matchFiltro = (l: any, f: Filtro) => {
    if (f === "todos") return true;
    if (f === "favoritos") return !!l.favorito;
    return l.statusEfetivo === f;
  };

  const counts = {
    todos: data.length,
    lendo: data.filter((l: any) => l.statusEfetivo === "lendo").length,
    quero_ler: data.filter((l: any) => l.statusEfetivo === "quero_ler").length,
    lido: data.filter((l: any) => l.statusEfetivo === "lido").length,
    relendo: data.filter((l: any) => l.statusEfetivo === "relendo").length,
    favoritos: data.filter((l: any) => !!l.favorito).length,
  };

  const filtrados = data.filter((l: any) => matchFiltro(l, filtro));

  const chips: { key: Filtro; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "lendo", label: "Lendo" },
    { key: "relendo", label: "Relendo" },
    { key: "quero_ler", label: "Quero ler" },
    { key: "lido", label: "Lidos" },
    { key: "favoritos", label: "Favoritos" },
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
          <div key={l.id} className="relative group">
            <button onClick={() => navigate(`/obras/${l.obra_id}`)} className="text-left hover-lift w-full">
              {l.obras?.capa_padrao_url ? (
                <img src={l.obras.capa_padrao_url} alt="" className="w-full aspect-[2/3] rounded-xl object-cover shadow-soft" />
              ) : (
                <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
              )}
              <p className="text-sm font-medium mt-2 line-clamp-2 break-words min-h-[2.5rem]">{l.obras?.titulo_original}</p>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorito(l.id, !!l.favorito);
              }}
              disabled={favoritando === l.id}
              className={cn(
                "absolute top-2 left-2 w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow-soft transition-opacity",
                l.favorito
                  ? "opacity-100 text-rose-500"
                  : "opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground",
              )}
              aria-label={l.favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              title={l.favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart className={cn("w-4 h-4", l.favorito && "fill-rose-500")} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRemoverAlvo({ id: l.id, titulo: l.obras?.titulo_original ?? "este livro" });
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center text-destructive shadow-soft opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label="Remover da biblioteca"
              title="Remover da biblioteca"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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
                "rounded-full px-4 h-9 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                ativo
                  ? c.key === "favoritos"
                    ? "bg-rose-500 text-white"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              {c.key === "favoritos" && (
                <Heart className={cn("w-3.5 h-3.5", ativo && "fill-white")} />
              )}
              {c.label} ({counts[c.key]})
            </button>
          );
        })}
      </div>
      <Grid items={filtrados} />

      <AlertDialog open={!!removerAlvo} onOpenChange={(o) => !o && setRemoverAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              "{removerAlvo?.titulo}" será removido da sua biblioteca, junto com leituras e progresso vinculados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmarRemocao(); }}
              disabled={removendo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removendo ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Livros;
