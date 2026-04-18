import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Livros = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data = [] } = useQuery({
    queryKey: ["meus-livros", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("*, obras(*)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const grupos = {
    lendo: data.filter((l: any) => l.status === "lendo"),
    quero_ler: data.filter((l: any) => l.status === "quero_ler"),
    lido: data.filter((l: any) => l.status === "lido" || l.status === "concluido"),
  };

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
          <button key={l.id} onClick={() => navigate(`/leituras/${l.id}`)} className="text-left hover-lift">
            {l.obras?.capa_padrao_url ? (
              <img src={l.obras.capa_padrao_url} alt="" className="w-full aspect-[2/3] rounded-xl object-cover shadow-soft" />
            ) : (
              <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            )}
            <p className="text-sm font-medium mt-2 line-clamp-2">{l.obras?.titulo_original}</p>
          </button>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Meus livros</h1>
      <Tabs defaultValue="lendo">
        <TabsList className="grid grid-cols-3 w-full rounded-2xl h-12 bg-muted">
          <TabsTrigger value="lendo" className="rounded-xl">Lendo</TabsTrigger>
          <TabsTrigger value="quero_ler" className="rounded-xl">Quero Ler</TabsTrigger>
          <TabsTrigger value="lido" className="rounded-xl">Lidos</TabsTrigger>
        </TabsList>
        <TabsContent value="lendo"><Grid items={grupos.lendo} /></TabsContent>
        <TabsContent value="quero_ler"><Grid items={grupos.quero_ler} /></TabsContent>
        <TabsContent value="lido"><Grid items={grupos.lido} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Livros;
