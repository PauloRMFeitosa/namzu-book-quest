import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { Bell, BellRing } from "lucide-react";

const Notificacoes = () => {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["notificacoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Notificações</h1>
      {data.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <Bell className="w-10 h-10 mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Sem notificações.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((n: any) => (
            <div key={n.id} className={`card-soft p-4 ${!n.lida ? "border-l-4 border-primary" : ""}`}>
              <p className="font-semibold text-sm">{n.titulo}</p>
              <p className="text-sm text-muted-foreground mt-1">{n.mensagem}</p>
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notificacoes;
