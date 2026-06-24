import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MISSOES_CODIGOS = [
  "diaria_ler_10pg",
  "diaria_registrar_insight",
  "diaria_publicar_clube",
];

export const useMissoesDiarias = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["missoes-diarias", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];

      const [missoesRes, progressoRes] = await Promise.all([
        supabase.from("missoes").select("*").in("codigo", MISSOES_CODIGOS),
        supabase
          .from("usuario_missoes")
          .select("*")
          .eq("user_id", user!.id)
          .eq("data" as any, hoje),
      ]);

      const progMap = new Map(
        (progressoRes.data ?? []).map((p: any) => [p.missao_id, p]),
      );

      const missoes = (missoesRes.data ?? []).map((m: any) => {
        const prog = progMap.get(m.id);
        const atual = prog?.progresso_atual ?? 0;
        return {
          ...m,
          atual,
          concluida: prog?.concluida ?? false,
          percentual: Math.min(100, Math.round((atual / m.meta_valor) * 100)),
        };
      });

      missoes.sort(
        (a: any, b: any) =>
          MISSOES_CODIGOS.indexOf(a.codigo) - MISSOES_CODIGOS.indexOf(b.codigo),
      );
      return missoes;
    },
  });
};
