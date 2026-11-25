// Visão geral do organizador (Fase 3). Tipos e lógica pura, testável sem React.

export type StatusLeitura = "nao_iniciou" | "lendo" | "concluido";
export type RespostaEncontro = "confirmado" | "talvez" | "recusado";

export interface MembroVisaoGeral {
  user_id: string;
  nome: string | null;
  avatar_url: string | null;
  papel: string;
  organizador: boolean;
  /** Nulo quando o clube ainda não tem livro definido. */
  percentual: number | null;
  status_leitura: StatusLeitura | null;
  ultima_atividade: string | null;
  parado: boolean;
  rsvp: RespostaEncontro | null;
}

export interface VisaoGeralClube {
  livro_atual: {
    obra_id: string;
    titulo: string;
    capa_url: string | null;
    data_inicio: string | null;
    data_fim: string | null;
  } | null;
  proximo_encontro: {
    id: string;
    titulo: string;
    inicio_em: string;
    url_evento: string | null;
    confirmados: number;
    talvez: number;
    recusados: number;
    sem_resposta: number;
  } | null;
  pedidos_pendentes: number;
  membros_ativos: number;
  parados: number;
  membros: MembroVisaoGeral[];
}

export type FiltroMembros = "todos" | "parados" | "nao_iniciou";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Texto curto para "quando foi a última atividade". */
export function rotuloUltimaAtividade(iso: string | null, agora: Date = new Date()): string {
  if (!iso) return "Sem atividade ainda";
  const quando = new Date(iso);
  if (Number.isNaN(quando.getTime())) return "Sem atividade ainda";
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const inicioDia = new Date(quando.getFullYear(), quando.getMonth(), quando.getDate()).getTime();
  const dias = Math.round((inicioHoje - inicioDia) / DIA_MS);
  if (dias <= 0) return "Ativo hoje";
  if (dias === 1) return "Ativo ontem";
  if (dias < 30) return `Ativo há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "Ativo há 1 mês" : `Ativo há ${meses} meses`;
}

/** Quantos membros estão em cada ponto do livro atual. */
export function resumoLeitura(membros: MembroVisaoGeral[]): Record<StatusLeitura, number> {
  const resumo: Record<StatusLeitura, number> = { nao_iniciou: 0, lendo: 0, concluido: 0 };
  for (const m of membros) {
    if (m.status_leitura) resumo[m.status_leitura] += 1;
  }
  return resumo;
}

/** "1 concluiu · 3 lendo · 2 não começaram", com singular e plural certos. */
export function textoResumoLeitura(resumo: Record<StatusLeitura, number>): string {
  const concluiu = resumo.concluido === 1 ? "1 concluiu" : `${resumo.concluido} concluíram`;
  const naoComecou = resumo.nao_iniciou === 1 ? "1 não começou" : `${resumo.nao_iniciou} não começaram`;
  return `${concluiu} · ${resumo.lendo} lendo · ${naoComecou}`;
}

export function filtrarMembros(membros: MembroVisaoGeral[], filtro: FiltroMembros): MembroVisaoGeral[] {
  if (filtro === "parados") return membros.filter((m) => m.parado);
  if (filtro === "nao_iniciou") return membros.filter((m) => m.status_leitura === "nao_iniciou" && !m.organizador);
  return membros;
}

/** "3 confirmaram, 1 talvez, 5 sem resposta" — omite o que for zero. */
export function resumoRespostas(e: NonNullable<VisaoGeralClube["proximo_encontro"]>): string {
  const partes: string[] = [];
  if (e.confirmados > 0) partes.push(e.confirmados === 1 ? "1 confirmou" : `${e.confirmados} confirmaram`);
  if (e.talvez > 0) partes.push(`${e.talvez} talvez`);
  if (e.recusados > 0) partes.push(e.recusados === 1 ? "1 não vai" : `${e.recusados} não vão`);
  if (e.sem_resposta > 0) partes.push(`${e.sem_resposta} sem resposta`);
  return partes.length ? partes.join(", ") : "Ninguém respondeu ainda";
}
