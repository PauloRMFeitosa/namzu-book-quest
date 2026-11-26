import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";

/** Um livro do acervo do NAMZU, com o que a grade de capas precisa. */
export interface AcervoItem {
  obra_id: string;
  edicao_id: string | null;
  titulo: string;
  titulo_ordenacao: string;
  ano: number | null;
  capa_url: string | null;
  autor: string | null;
  autor_ordenacao: string;
}

const POR_PAGINA = 500;
/** Teto de segurança. Passando disso, a busca precisa ir para o servidor. */
const LIMITE_DO_ACERVO = 5000;

/** O acervo de obras, usado na Busca e na inclusão de obra na trilha do clube. */
export const useAcervoObras = (habilitado = true) =>
  useQuery({
    queryKey: queryKeys.acervo.obras,
    enabled: habilitado,
    queryFn: async (): Promise<AcervoItem[]> => {
      // O banco entrega no máximo 1000 linhas por pedido: busca em páginas
      // até acabar, para o acervo inteiro aparecer na Busca e na trilha.
      const data: any[] = [];
      for (let inicio = 0; inicio < LIMITE_DO_ACERVO; inicio += POR_PAGINA) {
        const { data: pagina, error } = await supabase
          .from("obras")
          .select(
            `id, titulo_original, titulo_ordenacao, ano_primeira_publicacao, capa_padrao_url,
             obra_autores!left(ordem, autores(nome_completo, nome_ordenacao)),
             edicoes!left(id)`,
          )
          .order("id", { ascending: true })
          .range(inicio, inicio + POR_PAGINA - 1);
        if (error) {
          console.error("acervo query", error);
          break;
        }
        data.push(...(pagina ?? []));
        if (!pagina || pagina.length < POR_PAGINA) break;
      }

      const items: AcervoItem[] = [];
      const seen = new Set<string>();

      for (const o of data ?? []) {
        if (!o || seen.has(o.id)) continue;
        seen.add(o.id);
        const oas: any[] = (o as any).obra_autores ?? [];
        const principal = oas.slice().sort((a: any, b: any) => (a.ordem ?? 99) - (b.ordem ?? 99))[0];
        const edicoes: any[] = (o as any).edicoes ?? [];
        items.push({
          obra_id: (o as any).id,
          edicao_id: edicoes[0]?.id ?? null,
          titulo: (o as any).titulo_original,
          titulo_ordenacao: (o as any).titulo_ordenacao ?? (o as any).titulo_original?.toLowerCase() ?? "",
          ano: (o as any).ano_primeira_publicacao,
          capa_url: (o as any).capa_padrao_url,
          autor: principal?.autores?.nome_completo ?? null,
          autor_ordenacao: principal?.autores?.nome_ordenacao ?? "zzz",
        });
      }
      return items;
    },
  });
