import { Flame, Star, Brain } from "lucide-react";
import { useGamificacao } from "@/hooks/useGamificacao";

export const StatsChips = () => {
  const { data } = useGamificacao();
  const chips = [
    { icon: Flame, label: data?.streak_atual ?? 0, color: "text-orange-500" },
    { icon: Star, label: data?.xp_total ?? 0, color: "text-yellow-500" },
    { icon: Brain, label: `Nv ${data?.nivel ?? 1}`, color: "text-primary" },
  ];
  return (
    <div className="flex gap-2">
      {chips.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card shadow-soft text-sm font-semibold">
          <c.icon className={`w-4 h-4 ${c.color}`} />
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
};
