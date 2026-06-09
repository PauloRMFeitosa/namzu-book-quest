import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useDesafioMes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["desafio-mes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const fimMes = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [missaoRes, progRes] = await Promise.all([
        supabase
          .from("missoes")
          .select("*")
          .eq("tipo", "mensal")
          .lte("ativo_de", today.toISOString().slice(0, 10))
          .gte("ativo_ate", today.toISOString().slice(0, 10))
          .order("xp_recompensa", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("leitura_progresso")
          .select("paginas_lidas, data_registro")
          .eq("user_id", user!.id)
          .gte("data_registro", inicioMes)
          .lte("data_registro", fimMes),
      ]);

      const missao = (missaoRes.data ?? null) as any;
      const paginas = (progRes.data ?? []).reduce(
        (s: number, r: any) => s + (r.paginas_lidas ?? 0),
        0,
      );
      const meta = missao?.meta_valor ?? 500;
      return {
        missao,
        paginas,
        meta,
        percentual: Math.min(100, Math.round((paginas / meta) * 100)),
      };
    },
  });
};
