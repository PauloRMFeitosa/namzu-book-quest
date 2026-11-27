// Painel do organizador (Fase 3): o que pede atenção no clube e o histórico.
// Lógica pura, testável sem React.
import { abaixoDaMeta, type VisaoGeralClube } from "@/lib/visaoGeral";

export interface SemanaDoClube {
  /** Segunda-feira da semana, "AAAA-MM-DD". */
  inicio: string;
  leitores: number;
  participantes: number;
  membros: number;
}

export interface EncontroPassado {
  id: string;
  titulo: string;
  inicio_em: string;
  confirmados: number;
  presentes: number;
  tem_ata: boolean;
}

export interface HistoricoDoClube {
  semanas: SemanaDoClube[];
  encontros: EncontroPassado[];
}

export interface PendenciaDoClube {
  texto: string;
  /** O que fazer a respeito, em poucas palavras. */
  acao: string;
  secao: string;
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

/**
 * O que o organizador precisa resolver agora, do mais urgente para o menos.
 * Lista vazia quando o clube está em dia.
 */
export function pendenciasDoClube(
  visao: VisaoGeralClube,
  historico?: HistoricoDoClube | null,
  opcoes: { votacaoAberta?: boolean } = {},
): PendenciaDoClube[] {
  const lista: PendenciaDoClube[] = [];

  if (visao.pedidos_pendentes > 0) {
    lista.push({
      texto: `${plural(visao.pedidos_pendentes, "pessoa pediu", "pessoas pediram")} para entrar`,
      acao: "Aprovar ou recusar",
      secao: "membros",
    });
  }
  if (!visao.livro_atual) {
    lista.push({ texto: "O clube ainda não tem livro na trilha", acao: "Adicionar o primeiro livro", secao: "leitura" });
  } else if (!visao.meta_atual) {
    lista.push({
      texto: `"${visao.livro_atual.titulo}" está sem meta de leitura em aberto`,
      acao: "Montar o cronograma",
      secao: "leitura",
    });
  }
  if (!visao.proximo_encontro && !opcoes.votacaoAberta) {
    lista.push({ texto: "Nenhum encontro marcado", acao: "Marcar ou votar a data", secao: "encontros" });
  }
  if (visao.proximo_encontro && visao.proximo_encontro.sem_resposta > 0) {
    lista.push({
      texto: `${plural(visao.proximo_encontro.sem_resposta, "membro ainda não respondeu", "membros ainda não responderam")} ao próximo encontro`,
      acao: "Copiar lembrete para o grupo",
      secao: "visao",
    });
  }
  const abaixo = visao.membros.filter((m) => abaixoDaMeta(m, visao.meta_atual)).length;
  if (abaixo > 0) {
    lista.push({
      texto: `${plural(abaixo, "membro está", "membros estão")} abaixo da meta de leitura`,
      acao: "Copiar mensagem da meta",
      secao: "visao",
    });
  }
  if (visao.parados > 0) {
    lista.push({
      texto: `${plural(visao.parados, "membro parado", "membros parados")} há mais de 7 dias`,
      acao: "Ver quem são",
      secao: "membros",
    });
  }
  const semAta = (historico?.encontros ?? []).filter((e) => !e.tem_ata && e.presentes > 0).length;
  if (semAta > 0) {
    lista.push({ texto: `${plural(semAta, "encontro realizado", "encontros realizados")} sem ata`, acao: "Registrar o que foi combinado", secao: "encontros" });
  }
  const semPresenca = (historico?.encontros ?? []).filter((e) => e.presentes === 0).length;
  if (semPresenca > 0) {
    lista.push({ texto: `${plural(semPresenca, "encontro passado", "encontros passados")} sem lista de presença`, acao: "Marcar quem esteve", secao: "encontros" });
  }
  return lista;
}

/** Quantas pendências cada seção do painel tem, para o número ao lado do menu. */
export function avisosPorSecao(pendencias: PendenciaDoClube[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const p of pendencias) {
    if (p.secao === "visao") continue;
    contagem[p.secao] = (contagem[p.secao] ?? 0) + 1;
  }
  return contagem;
}

/** Série para o gráfico de participação: quantas pessoas fizeram algo em cada semana. */
export function serieDeParticipacao(historico: HistoricoDoClube | null | undefined): { dia: string; total: number }[] {
  return (historico?.semanas ?? []).map((s) => ({ dia: s.inicio, total: s.participantes }));
}

/** "4 de 7" presentes entre os que confirmaram ou "4 presentes" quando ninguém confirmou. */
export function textoDaPresenca(e: Pick<EncontroPassado, "confirmados" | "presentes">): string {
  if (e.presentes === 0) return "Presença não marcada";
  return plural(e.presentes, "presente", "presentes");
}

/** Parte dos membros que participou na semana mais recente, em %. Nulo sem membros. */
export function participacaoDaSemana(historico: HistoricoDoClube | null | undefined): number | null {
  const ultima = historico?.semanas?.[historico.semanas.length - 1];
  if (!ultima || ultima.membros <= 0) return null;
  return Math.min(100, Math.round((ultima.participantes / ultima.membros) * 100));
}
