import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/constants/queryKeys";

const MISSOES_CODIGOS = [
  "diaria_ler_10pg",
  "diaria_registrar_insight",
  "diaria_publicar_clube",
];

/**
 * Missões diárias lidas do servidor: o progresso é mantido em usuario_missoes
 * pelo motor de missões (registrar_progresso_missao + triggers), então o hook
 * apenas combina o catálogo ativo com o progresso do dia — sem recalcular
 * contagens no cliente.
 */
export const useMissoesDiarias = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.gamificacao.missoesDiarias(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const hoje = new Date();
      const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

      const [missoesRes, progressoRes] = await Promise.all([
        supabase.from("missoes").select("*").in("codigo", MISSOES_CODIGOS),
        supabase
          .from("usuario_missoes")
          .select("missao_id, progresso_atual, concluida")
          .eq("user_id", user!.id)
          .eq("data", hojeStr),
      ]);

      const progresso = new Map(
        (progressoRes.data ?? []).map((p) => [p.missao_id, p]),
      );

      const missoes = (missoesRes.data ?? []).map((m: any) => {
        const p = progresso.get(m.id);
        const atual = p?.progresso_atual ?? 0;
        return {
          ...m,
          atual,
          concluida: p?.concluida ?? atual >= m.meta_valor,
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
