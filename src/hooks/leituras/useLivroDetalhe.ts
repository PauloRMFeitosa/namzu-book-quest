import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LeituraFull = {
  id: string;
  tipo: string;
  paginas_lidas: number | null;
  percentual_lido: number | null;
  pagina_inicio: number | null;
  pagina_fim: number | null;
  created_at: string | null;
  leitura_pre: { intencao: string; dominio_previo: string | null; observacao: string | null } | null;
  leitura_conteudo: { id: string; resumo: string | null; conceito_principal: string | null }[];
  leitura_citacoes: { id: string; texto: string; pagina: number | null }[];
  leitura_aplicacoes: { id: string; descricao: string; plano_acao: any }[];
  leitura_links: { id: string; tipo: string | null; url: string; descricao: string | null }[];
  leitura_tags: { tag_id: string; tags: { id: string; nome: string } | null }[];
};

export type LivroDetalhe = {
  id: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  obra_id: string;
  obras: any;
  edicoes: { id: string; num_paginas: number | null; capa_url: string | null } | null;
  leituras: LeituraFull[];
  leitura_pos: any | null;
};

export function useLivroDetalhe(usuarioLivroId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["livro-detalhe", usuarioLivroId],
    enabled: !!usuarioLivroId && !!user,
    queryFn: async (): Promise<LivroDetalhe | null> => {
      const { data: ul, error } = await supabase
        .from("usuario_livros")
        .select("*, obras(*), edicoes(id, num_paginas, capa_url)")
        .eq("id", usuarioLivroId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!ul) return null;

      const { data: leituras, error: e2 } = await supabase
        .from("leituras")
        .select(`
          id, tipo, paginas_lidas, percentual_lido, pagina_inicio, pagina_fim, created_at,
          leitura_pre(intencao, dominio_previo, observacao),
          leitura_conteudo(id, resumo, conceito_principal),
          leitura_citacoes(id, texto, pagina),
          leitura_aplicacoes(id, descricao, plano_acao),
          leitura_links(id, tipo, url, descricao),
          leitura_tags(tag_id, tags(id, nome))
        `)
        .eq("usuario_livro_id", usuarioLivroId!)
        .order("created_at", { ascending: true });
      if (e2) throw e2;

      const { data: pos } = await supabase
        .from("leitura_pos")
        .select("*")
        .eq("usuario_livro_id", usuarioLivroId!)
        .maybeSingle();

      const normalized = (leituras ?? []).map((l: any) => ({
        ...l,
        leitura_pre: Array.isArray(l.leitura_pre) ? l.leitura_pre[0] ?? null : l.leitura_pre,
      })) as LeituraFull[];

      return { ...(ul as any), leituras: normalized, leitura_pos: pos };
    },
  });
}

export function calcularProgresso(livro: LivroDetalhe | null | undefined) {
  if (!livro) return { paginasLidas: 0, totalPaginas: null as number | null, percentual: 0, restantes: null as number | null };
  const paginasLidas = livro.leituras
    .filter((l) => l.tipo === "leitura")
    .reduce((acc, l) => acc + (l.paginas_lidas ?? 0), 0);
  const total = livro.edicoes?.num_paginas ?? null;
  const percentual = total && total > 0 ? Math.min(100, Math.round((paginasLidas / total) * 100)) : 0;
  const restantes = total ? Math.max(0, total - paginasLidas) : null;
  return { paginasLidas, totalPaginas: total, percentual, restantes };
}
