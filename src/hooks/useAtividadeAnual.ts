import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";

/**
 * Atividade diária de leitura do ano corrente, agregada a partir de
 * leitura_progresso (sessões registradas pelo usuário).
 * Retorna um mapa `{ "AAAA-MM-DD": totalPaginas }` — dias sem registro
 * simplesmente não aparecem no objeto.
 */
export function useAtividadeAnual(userId?: string) {
  return useQuery({
    queryKey: queryKeys.perfil.atividadeAnual(userId ?? ""),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Record<string, number>> => {
      const inicioAno = `${new Date().getFullYear()}-01-01`;
      const { data, error } = await supabase
        .from("leitura_progresso")
        .select("data_registro,created_at,paginas_lidas")
        .eq("user_id", userId!)
        .gte("data_registro", inicioAno);
      if (error) throw error;

      const porDia: Record<string, number> = {};
      for (const registro of data ?? []) {
        const dia = (registro.data_registro ?? registro.created_at ?? "").slice(0, 10);
        if (!dia) continue;
        // Sessão sem páginas informadas ainda conta como atividade mínima
        porDia[dia] = (porDia[dia] ?? 0) + Math.max(1, registro.paginas_lidas ?? 0);
      }
      return porDia;
    },
  });
}
