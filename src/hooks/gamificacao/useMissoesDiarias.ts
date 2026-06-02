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
    queryFn: async () => {
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();

      const [missoesRes, lidasRes, insightContRes, insightCitRes, postsRes, leiturasRes] =
        await Promise.all([
          supabase.from("missoes").select("*").in("codigo", MISSOES_CODIGOS),
          supabase
            .from("leitura_progresso")
            .select("paginas_lidas")
            .eq("user_id", user!.id)
            .gte("data_registro", inicioHoje),
          supabase
            .from("leitura_conteudo")
            .select("id, leitura_id")
            .gte("created_at", inicioHoje),
          supabase
            .from("leitura_citacoes")
            .select("id, leitura_id")
            .gte("created_at", inicioHoje),
          supabase
            .from("clube_posts")
            .select("id")
            .eq("user_id", user!.id)
            .gte("created_at", inicioHoje),
          supabase.from("leituras").select("id").eq("user_id", user!.id),
        ]);

      const meusLeituraIds = new Set((leiturasRes.data ?? []).map((l: any) => l.id));
      const paginasHoje = (lidasRes.data ?? []).reduce(
        (s: number, r: any) => s + (r.paginas_lidas ?? 0),
        0,
      );
      const insightsHoje =
        (insightContRes.data ?? []).filter((r: any) => meusLeituraIds.has(r.leitura_id)).length +
        (insightCitRes.data ?? []).filter((r: any) => meusLeituraIds.has(r.leitura_id)).length;
      const postsHoje = (postsRes.data ?? []).length;

      const missoes = (missoesRes.data ?? []).map((m: any) => {
        let atual = 0;
        if (m.codigo === "diaria_ler_10pg") atual = paginasHoje;
        else if (m.codigo === "diaria_registrar_insight") atual = insightsHoje;
        else if (m.codigo === "diaria_publicar_clube") atual = postsHoje;
        return {
          ...m,
          atual,
          concluida: atual >= m.meta_valor,
          percentual: Math.min(100, Math.round((atual / m.meta_valor) * 100)),
        };
      });

      // Ordenar conforme briefing
      missoes.sort(
        (a: any, b: any) =>
          MISSOES_CODIGOS.indexOf(a.codigo) - MISSOES_CODIGOS.indexOf(b.codigo),
      );
      return missoes;
    },
  });
};
