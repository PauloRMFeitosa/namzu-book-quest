import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface Props { clubeId: string; }

export const MembrosOnline = ({ clubeId }: Props) => {
  const { user } = useAuth();
  const [online, setOnline] = useState<Set<string>>(new Set());

  const { data: membros } = useQuery({
    queryKey: ["clube-membros-presence", clubeId],
    queryFn: async () => {
      const { data: ms } = await supabase
        .from("clube_membros")
        .select("user_id")
        .eq("clube_id", clubeId)
        .eq("status", "ativo")
        .limit(100);
      const ids = (ms ?? []).map((m) => m.user_id);
      if (!ids.length) return [];
      const { data: perfis } = await supabase
        .from("perfis")
        .select("user_id, nome_exibicao, username, avatar_url")
        .in("user_id", ids);
      return perfis ?? [];
    },
  });

  // Realtime presence via supabase channel
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`presence:clube:${clubeId}`, {
      config: { presence: { key: user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnline(new Set(Object.keys(state)));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubeId, user]);

  const ordenados = (membros ?? []).slice().sort((a: any, b: any) => {
    const ao = online.has(a.user_id) ? 0 : 1;
    const bo = online.has(b.user_id) ? 0 : 1;
    return ao - bo;
  });

  const onlineCount = ordenados.filter((m: any) => online.has(m.user_id)).length;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {onlineCount > 0 ? `${onlineCount} online` : "Todos offline"}
        </span>
      </div>
      {ordenados.map((m: any) => {
        const isOn = online.has(m.user_id);
        return (
          <div key={m.user_id} className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
            <div className="relative shrink-0">
              <Avatar className="w-7 h-7">
                <AvatarImage src={m.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(m.nome_exibicao ?? m.username ?? "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card ${
                  isOn ? "bg-green-500" : "bg-muted-foreground/30"
                }`}
                title={isOn ? "Online" : "Offline"}
              />
            </div>
            <span className={`text-xs truncate ${isOn ? "text-foreground" : "text-muted-foreground"}`}>
              {m.nome_exibicao ?? m.username ?? "Anônimo"}
            </span>
            <span className={`ml-auto text-[9px] shrink-0 ${isOn ? "text-green-500" : "text-muted-foreground/50"}`}>
              {isOn ? "online" : "offline"}
            </span>
          </div>
        );
      })}
    </div>
  );
};
