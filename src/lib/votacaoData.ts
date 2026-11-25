// Votação de data do encontro (Fase 3). Tipos e lógica pura, testável sem React.
import { quandoDoEncontro } from "@/lib/encontros";

export const MINIMO_OPCOES = 2;
export const MAXIMO_OPCOES = 6;

export interface OpcaoDeData {
  id: string;
  inicio_em: string;
  /** Quem marcou que pode nesta data. */
  votos: string[];
}

export interface VotacaoDeData {
  id: string;
  clube_id: string;
  titulo: string;
  url_evento: string | null;
  status: "aberta" | "encerrada" | "cancelada";
  created_at: string;
  opcoes: OpcaoDeData[];
}

/** Datas preenchidas, sem repetição, em ordem, prontas para o banco. */
export function opcoesParaEnvio(datasDigitadas: string[]): string[] {
  const instantes = datasDigitadas
    .map((d) => (d ? new Date(d) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
    .map((d) => d.toISOString());
  return [...new Set(instantes)].sort();
}

/** Devolve a primeira coisa a corrigir, ou nulo quando a votação pode ser aberta. */
export function validarVotacao(titulo: string, datasDigitadas: string[], agora: Date = new Date()): string | null {
  const nome = titulo.trim();
  if (!nome) return "Dê um nome para o encontro.";
  if (nome.length > 120) return "O nome do encontro passou de 120 letras.";
  const preenchidas = datasDigitadas.filter((d) => d.trim());
  if (preenchidas.some((d) => Number.isNaN(new Date(d).getTime()))) return "Há uma data inválida.";
  const opcoes = opcoesParaEnvio(preenchidas);
  if (opcoes.length < preenchidas.length) return "Há datas repetidas.";
  if (opcoes.length < MINIMO_OPCOES) return `Proponha pelo menos ${MINIMO_OPCOES} datas.`;
  if (opcoes.length > MAXIMO_OPCOES) return `Proponha no máximo ${MAXIMO_OPCOES} datas.`;
  if (opcoes.some((o) => new Date(o).getTime() <= agora.getTime())) return "Todas as datas precisam estar no futuro.";
  return null;
}

export function opcoesEmOrdem(votacao: Pick<VotacaoDeData, "opcoes">): OpcaoDeData[] {
  return [...votacao.opcoes].sort((a, b) => a.inicio_em.localeCompare(b.inicio_em));
}

/** Quantas pessoas diferentes já votaram em alguma data. */
export function totalDeVotantes(votacao: Pick<VotacaoDeData, "opcoes">): number {
  return new Set(votacao.opcoes.flatMap((o) => o.votos)).size;
}

/** Datas em que a pessoa marcou que pode. */
export function votosDe(votacao: Pick<VotacaoDeData, "opcoes">, userId: string | undefined): string[] {
  if (!userId) return [];
  return votacao.opcoes.filter((o) => o.votos.includes(userId)).map((o) => o.id);
}

/** A data com mais votos; no empate, a mais próxima. Nulo quando ninguém votou. */
export function opcaoMaisVotada(votacao: Pick<VotacaoDeData, "opcoes">): OpcaoDeData | null {
  const melhor = opcoesEmOrdem(votacao).reduce<OpcaoDeData | null>(
    (atual, o) => (!atual || o.votos.length > atual.votos.length ? o : atual),
    null,
  );
  return melhor && melhor.votos.length > 0 ? melhor : null;
}

/** Marca ou desmarca uma data na lista de quem está votando. */
export function alternarVoto(votos: string[], opcaoId: string): string[] {
  return votos.includes(opcaoId) ? votos.filter((v) => v !== opcaoId) : [...votos, opcaoId];
}

export function textoDeVotos(total: number): string {
  if (total === 0) return "Nenhum voto";
  return total === 1 ? "1 voto" : `${total} votos`;
}

export function textoDeVotantes(total: number): string {
  if (total === 0) return "Ninguém votou ainda";
  return total === 1 ? "1 pessoa votou" : `${total} pessoas votaram`;
}

/** Texto pronto para o organizador colar no grupo do clube. */
export function mensagemDaVotacao(dados: {
  nomeClube: string;
  votacao: Pick<VotacaoDeData, "titulo" | "opcoes">;
  link: string;
  agora?: Date;
}): string {
  const datas = opcoesEmOrdem(dados.votacao).map((o) => {
    const quando = quandoDoEncontro(o.inicio_em, dados.agora);
    return `• ${quando.charAt(0).toUpperCase()}${quando.slice(1)}`;
  });
  return [
    `🗳️ ${dados.nomeClube}`,
    `Estamos escolhendo a data de: ${dados.votacao.titulo}`,
    ...datas,
    "",
    `Marque quando você pode: ${dados.link}`,
  ].join("\n");
}
