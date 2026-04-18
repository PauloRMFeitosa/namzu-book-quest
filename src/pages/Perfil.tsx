import { useAuth } from "@/hooks/useAuth";
import { StatsChips } from "@/components/StatsChips";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGamificacao } from "@/hooks/useGamificacao";
import { Award, User as UserIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Perfil = () => {
  const { user } = useAuth();
  const { data: gam } = useGamificacao();

  const { data: conquistas = [] } = useQuery({
    queryKey: ["conquistas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_conquistas")
        .select("*, conquistas(*)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const xpAtual = gam?.xp_total ?? 0;
  const xpNivel = gam?.xp_proximo_nivel ?? 100;
  const progresso = Math.min(100, Math.round((xpAtual / xpNivel) * 100));

  return (
    <div className="flex flex-col gap-5">
      <div className="card-soft p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-lg">{user?.user_metadata?.full_name ?? user?.email}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <StatsChips />

      <div className="card-soft p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold">Nível {gam?.nivel ?? 1}</span>
          <span className="text-muted-foreground">{xpAtual} / {xpNivel} XP</span>
        </div>
        <Progress value={progresso} className="h-3" />
      </div>

      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Award className="w-4 h-4" /> Conquistas</h3>
        {conquistas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não desbloqueou conquistas.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {conquistas.map((c: any) => (
              <div key={c.conquista_id} className="card-soft p-3 text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold">{c.conquistas?.nome}</p>
                <p className="text-xs text-muted-foreground">+{c.conquistas?.xp_recompensa} XP</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Perfil;
