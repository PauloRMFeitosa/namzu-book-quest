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

type ProgressoAgg = { paginas: number; percentual: number; ultima: string | null };

const AGG_VAZIO: ProgressoAgg = { paginas: 0, percentual: 0, ultima: null };

async function aggregateProgresso(expIds: string[]) {
  const agg: Record<string, ProgressoAgg> = {};
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
    .select("leitura_id, paginas_lidas, percentual_lido, data_registro")
    .in("leitura_id", leituraIds);
  for (const p of prog ?? []) {
    const exp = idToExp[p.leitura_id ?? ""];
    if (!exp) continue;
    if (!agg[exp]) agg[exp] = { ...AGG_VAZIO };
    // paginas_lidas guarda a página atual do registro, não um delta —
    // o progresso é o maior valor registrado (mesma regra de calcularProgresso).
    agg[exp].paginas = Math.max(agg[exp].paginas, p.paginas_lidas ?? 0);
    agg[exp].percentual = Math.max(agg[exp].percentual, p.percentual_lido ?? 0);
    const dr = p.data_registro ?? null;
    if (dr && (!agg[exp].ultima || dr > agg[exp].ultima!)) agg[exp].ultima = dr;
  }
  return agg;
}

/**
 * Para experiências cuja edição vinculada não tem num_paginas, busca qualquer
 * outra edição da mesma obra que tenha — mesma regra do useLivroDetalhe.
 * Retorna um mapa obra_id → num_paginas.
 */
async function carregarTotaisAlternativos(exps: any[]): Promise<Record<string, number>> {
  const obraIds = Array.from(
    new Set(
      exps
        .filter((e: any) => !e.usuario_livros?.edicoes?.num_paginas)
        .map((e: any) => e.usuario_livros?.obra_id)
        .filter(Boolean),
    ),
  );
  if (!obraIds.length) return {};
  const { data } = await supabase
    .from("edicoes")
    .select("obra_id, num_paginas")
    .in("obra_id", obraIds)
    .not("num_paginas", "is", null);
  const map: Record<string, number> = {};
  for (const e of data ?? []) {
    if (e.obra_id && e.num_paginas && map[e.obra_id] == null) map[e.obra_id] = e.num_paginas;
  }
  return map;
}

function toLivroResumo(exp: any, agg: ProgressoAgg, totaisAlt: Record<string, number>): LivroResumo {
  const { paginas, percentual: percentualSalvo, ultima } = agg;
  const total =
    exp.usuario_livros?.edicoes?.num_paginas ??
    totaisAlt[exp.usuario_livros?.obra_id ?? ""] ??
    null;
  const obra = exp.usuario_livros?.obras;
  const autor =
    obra?.obra_autores?.[0]?.autores?.nome_completo ?? null;
  // Mesma regra de calcularProgresso (useLivroDetalhe): com total conhecido,
  // deriva da página atual; sem total, usa o último percentual salvo.
  const percentual = total && total > 0
    ? Math.min(100, Math.round((paginas / total) * 100))
    : Math.min(100, Math.round(percentualSalvo));
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
  "id, status, data_fim, data_inicio, usuario_livro_id, usuario_livros!inner(id, user_id, obra_id, obras(titulo_original, capa_padrao_url, obra_autores(ordem, autores(nome_completo))), edicoes(num_paginas))";

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
      const [agg, totaisAlt] = await Promise.all([
        aggregateProgresso(expIds),
        carregarTotaisAlternativos(exps ?? []),
      ]);
      return (exps ?? []).map((e: any) => toLivroResumo(e, agg[e.id] ?? AGG_VAZIO, totaisAlt));
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
      const [agg, totaisAlt] = await Promise.all([
        aggregateProgresso(expIds),
        carregarTotaisAlternativos(exps ?? []),
      ]);
      return (exps ?? []).map((e: any) => toLivroResumo(e, agg[e.id] ?? AGG_VAZIO, totaisAlt));
    },
  });
}

/** Última sessão registrada de uma leitura ATIVA → para "Continuar lendo". */
export function useUltimaSessao() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minhas-leituras-ultima-sessao", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LivroResumo | null> => {
      // Busca as últimas sessões e percorre até achar uma cuja leitura esteja ativa.
      const { data: prog } = await supabase
        .from("leitura_progresso")
        .select("leitura_id, data_registro")
        .eq("user_id", user!.id)
        .order("data_registro", { ascending: false })
        .limit(20);
      const leituraIds = Array.from(new Set((prog ?? []).map((p: any) => p.leitura_id).filter(Boolean)));
      if (!leituraIds.length) return null;

      const { data: leits } = await supabase
        .from("leituras")
        .select("id, usuario_leitura_id")
        .in("id", leituraIds);
      const leituraToExp: Record<string, string> = {};
      (leits ?? []).forEach((l: any) => {
        if (l.usuario_leitura_id) leituraToExp[l.id] = l.usuario_leitura_id;
      });

      // Mantém ordem cronológica da consulta de progresso
      let expIdAtivo: string | null = null;
      let ultimaData: string | null = null;
      const expIdsCandidatos = Array.from(
        new Set((prog ?? []).map((p: any) => leituraToExp[p.leitura_id ?? ""]).filter(Boolean)),
      );
      if (!expIdsCandidatos.length) return null;

      // Carrega só as leituras ainda em andamento (status = 'lendo')
      const { data: expsAtivas } = await supabase
        .from("usuario_leituras")
        .select("id, status")
        .in("id", expIdsCandidatos)
        .eq("status", "lendo");
      const ativos = new Set((expsAtivas ?? []).map((e: any) => e.id));
      if (!ativos.size) return null;

      for (const p of prog ?? []) {
        const expId = leituraToExp[p.leitura_id ?? ""];
        if (expId && ativos.has(expId)) {
          expIdAtivo = expId;
          ultimaData = p.data_registro ?? null;
          break;
        }
      }
      if (!expIdAtivo) return null;

      const { data: exp } = await supabase
        .from("usuario_leituras")
        .select(SELECT_EXP)
        .eq("id", expIdAtivo)
        .maybeSingle();
      if (!exp) return null;
      const [agg, totaisAlt] = await Promise.all([
        aggregateProgresso([expIdAtivo]),
        carregarTotaisAlternativos([exp]),
      ]);
      const a = agg[expIdAtivo] ?? { ...AGG_VAZIO, ultima: ultimaData };
      return toLivroResumo(exp, { ...a, ultima: a.ultima ?? ultimaData }, totaisAlt);
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
        .select("leitura_id, paginas_lidas, data_registro, tempo_leitura_minutos")
        .eq("user_id", user!.id)
        .gte("data_registro", inicioISO)
        .lt("data_registro", fimISO);

      const sessoesLeitura = progs?.length ?? 0;

      // Tempo: soma dos minutos gravados pelo cronômetro/registro manual
      let tempoMinutos: number | null = null;
      const leiturasComTempo = new Set<string>();
      for (const p of progs ?? []) {
        if (p.tempo_leitura_minutos != null) {
          tempoMinutos = (tempoMinutos ?? 0) + p.tempo_leitura_minutos;
          if (p.leitura_id) leiturasComTempo.add(p.leitura_id);
        }
      }

      // Livros tocados no período
      const leituraIds = Array.from(new Set((progs ?? []).map((p: any) => p.leitura_id).filter(Boolean)));
      let livros: LivroResumo[] = [];
      const expIdsAtivos = new Set<string>();
      const sessaoParaExp: Record<string, string> = {};

      if (leituraIds.length) {
        const { data: leits } = await supabase
          .from("leituras")
          .select("id, usuario_leitura_id, data_inicio, data_fim")
          .in("id", leituraIds);
        for (const l of leits ?? []) {
          if (l.usuario_leitura_id) {
            expIdsAtivos.add(l.usuario_leitura_id);
            sessaoParaExp[l.id] = l.usuario_leitura_id;
          }
          // Fallback para sessões antigas sem tempo gravado: usa a duração
          // data_inicio → data_fim da própria sessão (sem contar em dobro)
          if (!leiturasComTempo.has(l.id) && l.data_inicio && l.data_fim) {
            const ms = new Date(l.data_fim).getTime() - new Date(l.data_inicio).getTime();
            if (ms > 0 && ms < 1000 * 60 * 60 * 12) {
              tempoMinutos = (tempoMinutos ?? 0) + Math.round(ms / 60000);
            }
          }
        }
      }

      // Páginas lidas no período: paginas_lidas guarda a página atual, então
      // o avanço de cada experiência é a maior página registrada no período
      // menos a maior página registrada antes dele.
      const maxNoPeriodo: Record<string, number> = {};
      for (const p of progs ?? []) {
        const exp = sessaoParaExp[p.leitura_id ?? ""];
        if (!exp || p.paginas_lidas == null) continue;
        maxNoPeriodo[exp] = Math.max(maxNoPeriodo[exp] ?? 0, p.paginas_lidas);
      }
      let paginasLidas = 0;
      const expsComPaginas = Object.keys(maxNoPeriodo);
      if (expsComPaginas.length) {
        const { data: todasSessoes } = await supabase
          .from("leituras")
          .select("id, usuario_leitura_id")
          .in("usuario_leitura_id", expsComPaginas)
          .eq("tipo", "leitura");
        const todasSessaoParaExp: Record<string, string> = {};
        (todasSessoes ?? []).forEach((l: any) => (todasSessaoParaExp[l.id] = l.usuario_leitura_id));
        const maxAntes: Record<string, number> = {};
        const todasSessIds = Object.keys(todasSessaoParaExp);
        if (todasSessIds.length) {
          const { data: progsAntes } = await supabase
            .from("leitura_progresso")
            .select("leitura_id, paginas_lidas")
            .eq("user_id", user!.id)
            .in("leitura_id", todasSessIds)
            .lt("data_registro", inicioISO);
          for (const p of progsAntes ?? []) {
            const exp = todasSessaoParaExp[p.leitura_id ?? ""];
            if (!exp || p.paginas_lidas == null) continue;
            maxAntes[exp] = Math.max(maxAntes[exp] ?? 0, p.paginas_lidas);
          }
        }
        for (const exp of expsComPaginas) {
          paginasLidas += Math.max(0, maxNoPeriodo[exp] - (maxAntes[exp] ?? 0));
        }
      }

      const expIds = Array.from(expIdsAtivos);
      if (expIds.length) {
        const { data: exps } = await supabase
          .from("usuario_leituras")
          .select(SELECT_EXP)
          .eq("usuario_livros.user_id", user!.id)
          .in("id", expIds);
        const [agg, totaisAlt] = await Promise.all([
          aggregateProgresso(expIds),
          carregarTotaisAlternativos(exps ?? []),
        ]);
        livros = (exps ?? [])
          .map((e: any) => toLivroResumo(e, agg[e.id] ?? AGG_VAZIO, totaisAlt))
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
