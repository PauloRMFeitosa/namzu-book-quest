import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LeituraFull = {
  id: string;
  tipo: string;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string | null;
  /** agregado via leitura_progresso */
  paginas_lidas: number | null;
  percentual_lido: number | null;
  leitura_pre: { intencao: string; dominio_previo: string | null; observacao: string | null } | null;
  leitura_conteudo: { id: string; resumo: string | null; conceito_principal: string | null }[];
  leitura_citacoes: { id: string; texto: string; pagina: number | null }[];
  leitura_aplicacoes: { id: string; descricao: string; plano_acao: any }[];
  leitura_links: { id: string; tipo: string | null; url: string; descricao: string | null }[];
  leitura_tags: { tag_id: string; tags: { id: string; nome: string } | null }[];
};

export type LivroDetalhe = {
  /** id da experiência (usuario_leituras.id) */
  id: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  clube_id: string | null;
  tipo_origem: string;
  usuario_livro_id: string;
  obras: any;
  autores: { id: string; nome: string }[];
  edicoes: { id: string; num_paginas: number | null; capa_url: string | null; editora: string | null } | null;
  leituras: LeituraFull[];
  /** sessão pos_leitura + leitura_pos */
  pos_leitura: LeituraFull | null;
  leitura_pos: any | null;
};

export function useLivroDetalhe(usuarioLeituraId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["livro-detalhe", usuarioLeituraId],
    enabled: !!usuarioLeituraId && !!user,
    queryFn: async (): Promise<LivroDetalhe | null> => {
      const { data: ul, error } = await supabase
        .from("usuario_leituras")
        .select("*, usuario_livros!inner(id, user_id, obra_id, obras(*, obra_autores(ordem, autores(id, nome_completo))), edicoes(id, num_paginas, capa_url, editora))")
        .eq("id", usuarioLeituraId!)
        .maybeSingle();
      if (error) throw error;
      if (!ul) return null;
      if ((ul as any).usuario_livros?.user_id !== user!.id) return null;

      const { data: leiturasRaw, error: e2 } = await supabase
        .from("leituras")
        .select(`
          id, tipo, data_inicio, data_fim, created_at,
          leitura_pre(intencao, dominio_previo, observacao),
          leitura_conteudo(id, resumo, conceito_principal),
          leitura_citacoes(id, texto, pagina),
          leitura_aplicacoes(id, descricao, plano_acao),
          leitura_links(id, tipo, url, descricao),
          leitura_tags(tag_id, tags(id, nome)),
          leitura_progresso(paginas_lidas, percentual_lido)
        `)
        .eq("usuario_leitura_id", usuarioLeituraId!)
        .order("created_at", { ascending: true });
      if (e2) throw e2;

      const leituras: LeituraFull[] = (leiturasRaw ?? []).map((l: any) => {
        const progressos = l.leitura_progresso ?? [];
        const paginas_lidas = progressos.length
          ? Math.max(...progressos.map((p: any) => Number(p.paginas_lidas ?? 0))) || null
          : null;
        const percentual_lido = progressos.length
          ? Math.max(...progressos.map((p: any) => Number(p.percentual_lido ?? 0))) || null
          : null;
        return {
          id: l.id,
          tipo: l.tipo,
          data_inicio: l.data_inicio,
          data_fim: l.data_fim,
          created_at: l.created_at,
          paginas_lidas,
          percentual_lido,
          leitura_pre: Array.isArray(l.leitura_pre) ? l.leitura_pre[0] ?? null : l.leitura_pre,
          leitura_conteudo: l.leitura_conteudo ?? [],
          leitura_citacoes: l.leitura_citacoes ?? [],
          leitura_aplicacoes: l.leitura_aplicacoes ?? [],
          leitura_links: l.leitura_links ?? [],
          leitura_tags: l.leitura_tags ?? [],
        };
      });

      const pos_leitura = leituras.find((l) => l.tipo === "pos_leitura") ?? null;
      let leitura_pos: any = null;
      if (pos_leitura) {
        const { data } = await supabase.from("leitura_pos").select("*").eq("leitura_id", pos_leitura.id).maybeSingle();
        leitura_pos = data;
      }

      const ul_any = ul as any;
      const obrasRaw = ul_any.usuario_livros?.obras;
      const autoresArr = (obrasRaw?.obra_autores ?? [])
        .slice()
        .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((oa: any) => oa.autores && { id: oa.autores.id, nome: oa.autores.nome_completo })
        .filter(Boolean);

      // Fallback: se a edição vinculada não possui num_paginas, buscar
      // qualquer outra edição da mesma obra que tenha — mesma lógica usada
      // no fluxo de clubes (useClubeLeituras).
      let edicoes = ul_any.usuario_livros?.edicoes ?? null;
      const obraId = ul_any.usuario_livros?.obra_id;
      if ((!edicoes || !edicoes.num_paginas) && obraId) {
        const { data: alt } = await supabase
          .from("edicoes")
          .select("id, num_paginas, capa_url, editora")
          .eq("obra_id", obraId)
          .not("num_paginas", "is", null)
          .limit(1)
          .maybeSingle();
        if (alt?.num_paginas) {
          edicoes = edicoes
            ? { ...edicoes, num_paginas: alt.num_paginas }
            : alt;
        }
      }

      return {
        id: ul_any.id,
        status: ul_any.status,
        data_inicio: ul_any.data_inicio,
        data_fim: ul_any.data_fim,
        clube_id: ul_any.clube_id,
        tipo_origem: ul_any.tipo_origem,
        usuario_livro_id: ul_any.usuario_livro_id,
        obras: obrasRaw,
        autores: autoresArr,
        edicoes,
        leituras,
        pos_leitura,
        leitura_pos,
      };
    },
  });
}

export function calcularProgresso(livro: LivroDetalhe | null | undefined) {
  if (!livro) return { paginasLidas: 0, totalPaginas: null as number | null, percentual: 0, restantes: null as number | null };
  const sessions = livro.leituras.filter((l) => l.tipo === "leitura");
  const total = livro.edicoes?.num_paginas ?? null;
  const paginasLidas = sessions.length
    ? Math.max(0, ...sessions.map((s) => s.paginas_lidas ?? 0))
    : 0;
  const percentualSalvo = sessions.length
    ? Math.max(0, ...sessions.map((s) => s.percentual_lido ?? 0))
    : 0;
  // Regra: quando temos total de páginas, sempre derivamos da página atual.
  // Sem total, usamos o último percentual salvo.
  const percentual = total && total > 0
    ? Math.min(100, Math.round((paginasLidas / total) * 100))
    : Math.min(100, Math.round(percentualSalvo));
  const restantes = total ? Math.max(0, total - paginasLidas) : null;
  return { paginasLidas, totalPaginas: total, percentual, restantes };
}
