// Cronograma de leitura do clube (Fase 3). Tipos e lógica pura, testável sem
// React. Todas as datas aqui são dias no formato "AAAA-MM-DD", sem hora, para
// não escorregar um dia por causa do fuso.

export interface MetaLeitura {
  id: string;
  trilha_id: string;
  clube_id: string;
  titulo: string;
  /** Até que ponto do livro a meta vai, em %. Nulo quando o organizador não informou. */
  percentual_alvo: number | null;
  data_limite: string;
}

/** Meta em edição: ainda pode não ter id. */
export interface MetaRascunho {
  id?: string;
  titulo: string;
  percentual_alvo: number | null;
  data_limite: string;
}

export type SituacaoNaMeta = "alcancou" | "abaixo" | "sem_alvo";

export const MAXIMO_METAS = 60;

const DIA_MS = 24 * 60 * 60 * 1000;
const FORMATO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Lê "AAAA-MM-DD" como dia no fuso de quem usa o app. Nulo se o texto não for um dia válido. */
export function lerDia(dia: string | null | undefined): Date | null {
  const partes = FORMATO_DIA.exec(dia ?? "");
  if (!partes) return null;
  const [, ano, mes, d] = partes.map(Number);
  const data = new Date(ano, mes - 1, d);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== d) return null;
  return data;
}

export function escreverDia(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function hojeComoDia(agora: Date = new Date()): string {
  return escreverDia(agora);
}

export function somarDias(dia: string, quantidade: number): string {
  const data = lerDia(dia);
  if (!data) return dia;
  data.setDate(data.getDate() + quantidade);
  return escreverDia(data);
}

/** Dias de `de` até `ate`. Negativo quando `ate` já passou. */
export function diasEntre(de: string, ate: string): number {
  const a = lerDia(de);
  const b = lerDia(ate);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / DIA_MS);
}

/** "30/11" */
export function diaCurto(dia: string | null | undefined): string {
  const data = lerDia(dia);
  if (!data) return "";
  return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
}

const DIAS_DA_SEMANA = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

/** "dom., 30/11" */
export function diaComSemana(dia: string | null | undefined): string {
  const data = lerDia(dia);
  if (!data) return "";
  return `${DIAS_DA_SEMANA[data.getDay()]}, ${diaCurto(dia)}`;
}

/** "10/11 a 30/11", "A partir de 10/11" ou "Até 30/11". */
export function periodoDoLivro(inicio: string | null, fim: string | null): string {
  if (inicio && fim) return `${diaCurto(inicio)} a ${diaCurto(fim)}`;
  if (inicio) return `A partir de ${diaCurto(inicio)}`;
  if (fim) return `Até ${diaCurto(fim)}`;
  return "";
}

/** "termina hoje", "termina amanhã", "faltam 5 dias", "terminou ontem", "terminou há 3 dias". */
export function prazoDaMeta(dataLimite: string, hoje: string = hojeComoDia()): string {
  const dias = diasEntre(hoje, dataLimite);
  if (dias === 0) return "termina hoje";
  if (dias === 1) return "termina amanhã";
  if (dias > 1) return `faltam ${dias} dias`;
  if (dias === -1) return "terminou ontem";
  return `terminou há ${-dias} dias`;
}

/**
 * Divide o período do livro em semanas. Cada semana vira uma meta que termina
 * no sétimo dia; a última termina no fim do livro e vale 100%. O alvo de cada
 * meta acompanha a parte do período que já passou.
 */
export function dividirEmSemanas(inicio: string, fim: string): MetaRascunho[] {
  const total = diasEntre(inicio, fim) + 1;
  if (!lerDia(inicio) || !lerDia(fim) || total < 1) return [];
  const semanas = Math.ceil(total / 7);
  if (semanas > MAXIMO_METAS) return [];

  const metas: MetaRascunho[] = [];
  for (let i = 1; i <= semanas; i++) {
    const ultima = i === semanas;
    const diasAteAqui = ultima ? total : i * 7;
    metas.push({
      titulo: `Semana ${i}`,
      data_limite: somarDias(inicio, diasAteAqui - 1),
      percentual_alvo: ultima ? 100 : Math.max(1, Math.round((diasAteAqui / total) * 100)),
    });
  }
  return metas;
}

export function ordenarMetas<T extends { data_limite: string }>(metas: T[]): T[] {
  return [...metas].sort((a, b) => a.data_limite.localeCompare(b.data_limite));
}

/** A primeira meta que ainda não venceu. Nulo quando todas já passaram ou não há metas. */
export function metaAtual<T extends { data_limite: string }>(metas: T[], hoje: string = hojeComoDia()): T | null {
  return ordenarMetas(metas).find((m) => m.data_limite >= hoje) ?? null;
}

export function situacaoNaMeta(
  percentual: number | null | undefined,
  concluiu: boolean,
  meta: { percentual_alvo: number | null },
): SituacaoNaMeta {
  if (concluiu) return "alcancou";
  if (meta.percentual_alvo === null || meta.percentual_alvo === undefined) return "sem_alvo";
  return (percentual ?? 0) >= meta.percentual_alvo ? "alcancou" : "abaixo";
}

/** Página correspondente ao alvo, quando se sabe o total de páginas do livro. */
export function paginaDoAlvo(percentualAlvo: number | null, totalPaginas: number | null | undefined): number | null {
  if (!percentualAlvo || !totalPaginas || totalPaginas <= 0) return null;
  return Math.min(totalPaginas, Math.max(1, Math.round((percentualAlvo / 100) * totalPaginas)));
}

/**
 * "até 50% do livro, perto da página 132" ou só "até 50% do livro". A página é
 * aproximada porque cada edição tem um total diferente. Vazio quando a meta
 * não tem alvo.
 */
export function textoDoAlvo(percentualAlvo: number | null, totalPaginas: number | null | undefined): string {
  if (!percentualAlvo) return "";
  if (percentualAlvo >= 100) return "até o fim do livro";
  const pagina = paginaDoAlvo(percentualAlvo, totalPaginas);
  return pagina ? `até ${percentualAlvo}% do livro, perto da página ${pagina}` : `até ${percentualAlvo}% do livro`;
}

/** Devolve a primeira coisa a corrigir, ou nulo quando o cronograma pode ser salvo. */
export function validarCronograma(inicio: string, fim: string, metas: MetaRascunho[]): string | null {
  if (inicio && !lerDia(inicio)) return "A data de início não é válida.";
  if (fim && !lerDia(fim)) return "A data de fim não é válida.";
  if (inicio && fim && fim < inicio) return "A data de fim do livro não pode ser antes do início.";
  if (metas.length > MAXIMO_METAS) return `O cronograma aceita até ${MAXIMO_METAS} metas por livro.`;
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i];
    const n = i + 1;
    if (!m.titulo.trim()) return `Dê um nome para a meta ${n}.`;
    if (m.titulo.trim().length > 80) return `O nome da meta ${n} passou de 80 letras.`;
    if (!lerDia(m.data_limite)) return `Informe a data da meta ${n}.`;
    if (m.percentual_alvo !== null) {
      if (!Number.isInteger(m.percentual_alvo) || m.percentual_alvo < 1 || m.percentual_alvo > 100) {
        return `O alvo da meta ${n} precisa ficar entre 1 e 100%.`;
      }
    }
  }
  return null;
}

/** Converte o que o organizador digitou no campo de % em alvo. Vazio vira nulo. */
export function lerAlvo(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const numero = Number(limpo.replace(",", "."));
  return Number.isFinite(numero) ? Math.round(numero) : null;
}

/** O livro do ciclo: mesma regra do banco em `clube_visao_geral` e `clube_convite`. */
export function livroDoCiclo<T extends { ordem: number; data_inicio_sugerida: string | null; data_fim_sugerida: string | null }>(
  trilha: T[],
  hoje: string = hojeComoDia(),
): T | null {
  if (!trilha.length) return null;
  const noPeriodo = (t: T) =>
    !!t.data_inicio_sugerida && !!t.data_fim_sugerida && t.data_inicio_sugerida <= hoje && hoje <= t.data_fim_sugerida;
  const naoTerminou = (t: T) => !t.data_fim_sugerida || t.data_fim_sugerida >= hoje;
  return [...trilha].sort(
    (a, b) =>
      Number(noPeriodo(b)) - Number(noPeriodo(a)) ||
      Number(naoTerminou(b)) - Number(naoTerminou(a)) ||
      a.ordem - b.ordem,
  )[0];
}

/** Texto pronto para o organizador colar no grupo do clube. */
export function mensagemDaMeta(dados: {
  nomeClube: string;
  livro: string;
  meta: { titulo: string; percentual_alvo: number | null; data_limite: string };
  totalPaginas?: number | null;
  link: string;
}): string {
  const alvo = textoDoAlvo(dados.meta.percentual_alvo, dados.totalPaginas);
  const linhas = [
    `📖 ${dados.nomeClube}`,
    `Meta de leitura: ${dados.meta.titulo}${alvo ? ` (${alvo})` : ""}`,
    `Livro: ${dados.livro}`,
    `Prazo: ${diaComSemana(dados.meta.data_limite)}`,
    "",
    `Registre seu progresso: ${dados.link}`,
  ];
  return linhas.join("\n");
}
