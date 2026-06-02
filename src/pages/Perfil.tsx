import { useAuth } from "@/hooks/useAuth";
import { StatsChips } from "@/components/StatsChips";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGamificacao } from "@/hooks/useGamificacao";
import { PageHero } from "@/components/PageHero";
import { Award, User as UserIcon, BookOpen, Flame, PenLine, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const CATEGORIAS = [
  { key: "leitura", label: "Leitura", icon: BookOpen, emoji: "📚" },
  { key: "consistencia", label: "Consistência", icon: Flame, emoji: "🔥" },
  { key: "conhecimento", label: "Produção de Conhecimento", icon: PenLine, emoji: "✍️" },
  { key: "comunidade", label: "Comunidade", icon: Users, emoji: "👥" },
];

function categoriaDe(c: any): string {
  if (c.categoria) return c.categoria;
  const codigo: string = c.codigo ?? "";
  if (codigo.startsWith("leitura") || codigo === "primeiro_livro") return "leitura";
  if (codigo.startsWith("consistencia")) return "consistencia";
  if (codigo.startsWith("conhecimento")) return "conhecimento";
  if (codigo.startsWith("comunidade")) return "comunidade";
  return "leitura";
}

const Perfil = () => {
  const { user } = useAuth();
  const { data: gam } = useGamificacao();

  const { data: todasConquistas = [] } = useQuery({
    queryKey: ["todas-conquistas"],
    queryFn: async () => {
      const { data } = await supabase.from("conquistas").select("*").order("xp_recompensa");
      return data ?? [];
    },
  });

  const { data: minhasConquistas = [] } = useQuery({
    queryKey: ["conquistas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_conquistas")
        .select("conquista_id")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const ownedIds = new Set(minhasConquistas.map((c: any) => c.conquista_id));
  const xpAtual = gam?.xp_total ?? 0;
  const xpNivel = gam?.xp_proximo_nivel ?? 100;
  const progresso = Math.min(100, Math.round((xpAtual / xpNivel) * 100));

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        icon={UserIcon}
        badge="Você"
        title={<>Seu <span className="text-gradient-warm">perfil</span></>}
        description="Estatísticas, nível e conquistas."
      />

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
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Award className="w-4 h-4" /> Conquistas
        </h3>
        <div className="flex flex-col gap-5">
          {CATEGORIAS.map((cat) => {
            const conquistasCat = todasConquistas.filter(
              (c: any) => categoriaDe(c) === cat.key,
            );
            if (!conquistasCat.length) return null;
            const obtidas = conquistasCat.filter((c: any) => ownedIds.has(c.id)).length;
            return (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                    {cat.emoji} {cat.label}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {obtidas} / {conquistasCat.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {conquistasCat.map((c: any) => {
                    const obtida = ownedIds.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`card-soft p-3 text-center transition ${obtida ? "" : "opacity-50 grayscale"}`}
                      >
                        <Award
                          className={`w-7 h-7 mx-auto mb-1.5 ${obtida ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <p className="text-xs font-semibold leading-tight">{c.nome}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          +{c.xp_recompensa} XP
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Perfil;
