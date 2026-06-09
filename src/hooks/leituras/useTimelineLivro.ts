import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LivroDetalhe } from "./useLivroDetalhe";

export type TimelineEvent = {
  id: string;
  tipo: "progresso" | "insight" | "aplicacao" | "citacao" | "pre_leitura" | "pos_leitura" | "conclusao";
  titulo: string;
  detalhe?: string;
  data: string;
};

/**
 * Timeline derivada do LivroDetalhe + leitura_progresso.
 * Não cria tabela — agrega registros existentes.
 */
export function useTimelineLivro(livro: LivroDetalhe | null | undefined) {
  return useQuery({
    queryKey: ["timeline-livro", livro?.id],
    enabled: !!livro,
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!livro) return [];
      const events: TimelineEvent[] = [];

      // Progresso (sessões reais)
      const leiturasIds = livro.leituras.filter((l) => l.tipo === "leitura").map((l) => l.id);
      if (leiturasIds.length) {
        const { data: prog } = await supabase
          .from("leitura_progresso")
          .select("id, leitura_id, paginas_lidas, percentual_lido, data_registro")
          .in("leitura_id", leiturasIds);
        (prog ?? []).forEach((p: any) => {
          events.push({
            id: `prog-${p.id}`,
            tipo: "progresso",
            titulo: p.paginas_lidas
              ? `Atualizou progresso para página ${p.paginas_lidas}`
              : `Atualizou progresso${p.percentual_lido ? ` (${Math.round(p.percentual_lido)}%)` : ""}`,
            data: p.data_registro,
          });
        });
      }

      // Insights / aplicações / citações
      livro.leituras.forEach((l) => {
        l.leitura_conteudo.forEach((c) => {
          events.push({
            id: `ins-${c.id}`,
            tipo: "insight",
            titulo: "Registrou insight",
            detalhe: c.resumo ?? undefined,
            data: l.created_at ?? "",
          });
        });
        l.leitura_aplicacoes.forEach((a) => {
          events.push({
            id: `apl-${a.id}`,
            tipo: "aplicacao",
            titulo: "Registrou aplicação",
            detalhe: a.descricao,
            data: l.created_at ?? "",
          });
        });
        l.leitura_citacoes.forEach((c) => {
          events.push({
            id: `cit-${c.id}`,
            tipo: "citacao",
            titulo: "Registrou citação",
            detalhe: c.texto.slice(0, 100),
            data: l.created_at ?? "",
          });
        });
      });

      // Pré
      const pre = livro.leituras.find((l) => l.tipo === "pre_leitura");
      if (pre && pre.leitura_pre) {
        events.push({
          id: `pre-${pre.id}`,
          tipo: "pre_leitura",
          titulo: "Concluiu pré-leitura",
          data: pre.created_at ?? "",
        });
      }

      // Pós
      if (livro.pos_leitura && livro.leitura_pos) {
        events.push({
          id: `pos-${livro.pos_leitura.id}`,
          tipo: "pos_leitura",
          titulo: "Registrou pós-leitura",
          data: livro.pos_leitura.created_at ?? "",
        });
      }

      // Conclusão
      if (livro.status === "concluido" && livro.data_fim) {
        events.push({
          id: `con-${livro.id}`,
          tipo: "conclusao",
          titulo: "Concluiu o livro",
          data: livro.data_fim,
        });
      }

      return events
        .filter((e) => !!e.data)
        .sort((a, b) => b.data.localeCompare(a.data));
    },
  });
}
