import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy } from "lucide-react";

const Metas = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data: missoes = [] } = useQuery({
    queryKey: ["missoes-ativas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("missoes")
        .select("*")
        .lte("ativo_de", today)
        .gte("ativo_ate", today);
      return data ?? [];
    },
  });

  const { data: progressos = [] } = useQuery({
    queryKey: ["minhas-missoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("usuario_missoes").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const getProgresso = (missao_id: string) => progressos.find((p: any) => p.missao_id === missao_id);

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={Trophy}
        badge="Desafios"
        title={<>Suas <span className="text-gradient-warm">metas</span></>}
        description="Missões ativas e progresso de recompensas."
      />
      {missoes.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <Target className="w-10 h-10 mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma missão ativa no momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {missoes.map((m: any) => {
            const p = getProgresso(m.id);
            const atual = p?.progresso_atual ?? 0;
            const pct = Math.min(100, Math.round((atual / m.meta_valor) * 100));
            return (
              <div key={m.id} className="card-soft p-4">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <p className="font-semibold">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground">{m.descricao}</p>
                  </div>
                  <span className="text-xs font-bold text-primary">+{m.xp_recompensa} XP</span>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{atual} / {m.meta_valor}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Metas;
