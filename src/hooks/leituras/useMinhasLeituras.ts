import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LivroResumo = {
  usuario_leitura_id: string;
  usuario_livro_id: string;
  titulo: string;
  autor?: string | null;
  capa_url?: string | null;
  total_paginas: number | null;
  paginas_lidas: number;
  percentual: number;
  ultima_sessao: string | null;
  data_fim?: string | null;
  status: string;
};

async function aggregateProgresso(expIds: string[]) {
  const agg: Record<string, { paginas: number; ultima: string | null }> = {};
  if (!expIds.length) return agg;
  const { data: leituras } = await supabase
    .from("leituras")
    .select("id, usuario_leitura_id")
    .in("usuario_leitura_id", expIds)
    .eq("tipo", "leitura");
  const leituraIds = (leituras ?? []).map((l: any) => l.id);
  const idToExp: Record<string, string> = {};
  (leituras ?? []).forEach((l: any) => (idToExp[l.id] = l.usuario_leitura_id));
  if (!leituraIds.length) return agg;
  const { data: prog } = await supabase
    .from("leitura_progresso")
    .select("leitura_id, paginas_lidas, data_registro")
    .in("leitura_id", leituraIds);
  for (const p of prog ?? []) {
    const exp = idToExp[p.leitura_id ?? ""];
    if (!exp) continue;
    if (!agg[exp]) agg[exp] = { paginas: 0, ultima: null };
    agg[exp].paginas += p.paginas_lidas ?? 0;
    const dr = p.data_registro ?? null;
    if (dr && (!agg[exp].ultima || dr > agg[exp].ultima!)) agg[exp].ultima = dr;
  }
  return agg;
}

function toLivroResumo(exp: any, paginas: number, ultima: string | null): LivroResumo {
  const total = exp.usuario_livros?.edicoes?.num_paginas ?? null;
  const obra = exp.usuario_livros?.obras;
  const autor =
    obra?.obra_autores?.[0]?.autores?.nome_completo ?? null;
  const percentual = total && total > 0 ? Math.min(100, Math.round((paginas / total) * 100)) : 0;
  return {
    usuario_leitura_id: exp.id,
    usuario_livro_id: exp.usuario_livro_id,
    titulo: obra?.titulo_original ?? "—",
    autor,
    capa_url: obra?.capa_padrao_url ?? null,
    total_paginas: total,
    paginas_lidas: paginas,
    percentual,
    ultima_sessao: ultima,
    data_fim: exp.data_fim ?? null,
    status: exp.status,
  };
}

const SELECT_EXP =
  "id, status, data_fim, data_inicio, usuario_livro_id, usuario_livros!inner(id, user_id, obras(titulo_original, capa_padrao_url, obra_autores(ordem, autores(nome_completo))), edicoes(num_paginas))";

export function useLendoList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minhas-leituras-lendo", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LivroResumo[]> => {
      const { data: exps } = await supabase
        .from("usuario_leituras")
        .select(SELECT_EXP)
        .eq("usuario_livros.user_id", user!.id)
        .eq("status", "lendo")
        .order("updated_at", { ascending: false });
      const expIds = (exps ?? []).map((e: any) => e.id);
      const agg = await aggregateProgresso(expIds);
      return (exps ?? []).map((e: any) => {
        const a = agg[e.id] ?? { paginas: 0, ultima: null };
        return toLivroResumo(e, a.paginas, a.ultima);
      });
    },
  });
}

export function useConcluidosRecentes(limit = 8) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minhas-leituras-concluidos", user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<LivroResumo[]> => {
      const { data: exps } = await supabase
        .from("usuario_leituras")
        .select(SELECT_EXP)
        .eq("usuario_livros.user_id", user!.id)
        .eq("status", "concluido")
        .order("data_fim", { ascending: false })
        .limit(limit);
      const expIds = (exps ?? []).map((e: any) => e.id);
      const agg = await aggregateProgresso(expIds);
      return (exps ?? []).map((e: any) => {
        const a = agg[e.id] ?? { paginas: 0, ultima: null };
        return toLivroResumo(e, a.paginas, a.ultima);
      });
    },
  });
}

/** Última sessão registrada (qualquer livro) → para "Continuar lendo". */
export function useUltimaSessao() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minhas-leituras-ultima-sessao", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LivroResumo | null> => {
      const { data: prog } = await supabase
        .from("leitura_progresso")
        .select("leitura_id, data_registro")
        .eq("user_id", user!.id)
        .order("data_registro", { ascending: false })
        .limit(1);
      const leituraId = prog?.[0]?.leitura_id;
      if (!leituraId) return null;
      const { data: leit } = await supabase
        .from("leituras")
        .select("usuario_leitura_id")
        .eq("id", leituraId)
        .maybeSingle();
      const expId = (leit as any)?.usuario_leitura_id;
      if (!expId) return null;
      const { data: exp } = await supabase
        .from("usuario_leituras")
        .select(SELECT_EXP)
        .eq("id", expId)
        .maybeSingle();
      if (!exp) return null;
      const agg = await aggregateProgresso([expId]);
      const a = agg[expId] ?? { paginas: 0, ultima: prog?.[0]?.data_registro ?? null };
      return toLivroResumo(exp, a.paginas, a.ultima);
    },
  });
}

export type EstatisticasPeriodo = {
  livrosIniciados: number;
  livrosConcluidos: number;
  paginasLidas: number;
  sessoesLeitura: number;
  tempoMinutos: number | null;
  livros: LivroResumo[];
};

function periodRange(mes: number | "all", ano: number) {
  const inicio = mes === "all" ? new Date(ano, 0, 1) : new Date(ano, mes - 1, 1);
  const fim = mes === "all" ? new Date(ano + 1, 0, 1) : new Date(ano, mes, 1);
  return { inicioISO: inicio.toISOString(), fimISO: fim.toISOString() };
}

export function useEstatisticasPeriodo(mes: number | "all", ano: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minhas-leituras-stats", user?.id, mes, ano],
    enabled: !!user,
    queryFn: async (): Promise<EstatisticasPeriodo> => {
      const { inicioISO, fimISO } = periodRange(mes, ano);

      // Páginas + sessões a partir de leitura_progresso
      const { data: progs } = await supabase
        .from("leitura_progresso")
        .select("leitura_id, paginas_lidas, data_registro")
        .eq("user_id", user!.id)
        .gte("data_registro", inicioISO)
        .lt("data_registro", fimISO);

      const paginasLidas = (progs ?? []).reduce((s, p) => s + (p.paginas_lidas ?? 0), 0);
      const sessoesLeitura = progs?.length ?? 0;

      // Livros tocados no período
      const leituraIds = Array.from(new Set((progs ?? []).map((p: any) => p.leitura_id).filter(Boolean)));
      let livros: LivroResumo[] = [];
      let tempoMinutos: number | null = null;
      const expIdsAtivos = new Set<string>();

      if (leituraIds.length) {
        const { data: leits } = await supabase
          .from("leituras")
          .select("id, usuario_leitura_id, data_inicio, data_fim")
          .in("id", leituraIds);
        for (const l of leits ?? []) {
          if (l.usuario_leitura_id) expIdsAtivos.add(l.usuario_leitura_id);
          if (l.data_inicio && l.data_fim) {
            const ms = new Date(l.data_fim).getTime() - new Date(l.data_inicio).getTime();
            if (ms > 0 && ms < 1000 * 60 * 60 * 12) {
              tempoMinutos = (tempoMinutos ?? 0) + Math.round(ms / 60000);
            }
          }
        }
      }

      const expIds = Array.from(expIdsAtivos);
      if (expIds.length) {
        const { data: exps } = await supabase
          .from("usuario_leituras")
          .select(SELECT_EXP)
          .eq("usuario_livros.user_id", user!.id)
          .in("id", expIds);
        const agg = await aggregateProgresso(expIds);
        livros = (exps ?? [])
          .map((e: any) => toLivroResumo(e, agg[e.id]?.paginas ?? 0, agg[e.id]?.ultima ?? null))
          .sort((a, b) => (b.ultima_sessao ?? "").localeCompare(a.ultima_sessao ?? ""));
      }

      // Livros iniciados/concluídos no período
      const { data: iniciados } = await supabase
        .from("usuario_leituras")
        .select("id, usuario_livros!inner(user_id)")
        .eq("usuario_livros.user_id", user!.id)
        .gte("data_inicio", inicioISO)
        .lt("data_inicio", fimISO);
      const { data: concluidos } = await supabase
        .from("usuario_leituras")
        .select("id, usuario_livros!inner(user_id)")
        .eq("usuario_livros.user_id", user!.id)
        .eq("status", "concluido")
        .gte("data_fim", inicioISO)
        .lt("data_fim", fimISO);

      return {
        livrosIniciados: iniciados?.length ?? 0,
        livrosConcluidos: concluidos?.length ?? 0,
        paginasLidas,
        sessoesLeitura,
        tempoMinutos,
        livros,
      };
    },
  });
}
