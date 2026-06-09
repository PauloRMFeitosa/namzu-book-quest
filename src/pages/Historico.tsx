import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { History, ScrollText } from "lucide-react";

const Historico = () => {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["historico-xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("gamificacao_xp_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={ScrollText}
        badge="Registro"
        title={<>Seu <span className="text-gradient-warm">histórico</span></>}
        description="Todas as suas atividades e ganhos de XP."
      />
      {data.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <History className="w-10 h-10 mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Sem atividades ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((l: any) => (
            <div key={l.id} className="card-soft p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm capitalize">{l.acao.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <span className="text-sm font-bold text-primary">+{l.xp_ganho} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Historico;
