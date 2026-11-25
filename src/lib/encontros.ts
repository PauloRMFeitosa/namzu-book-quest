// Encontros do clube (Fase 3): lembrete para o grupo, lista de presença e ata.
// Lógica pura, testável sem React.

export type RespostaAoEncontro = "confirmado" | "talvez" | "recusado";

export const MAXIMO_ATA = 20000;

const DIAS_DA_SEMANA = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
const doisDigitos = (n: number) => String(n).padStart(2, "0");

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "hoje, às 19:30", "amanhã, às 19:30" ou "sáb., 28/11, às 19:30". */
export function quandoDoEncontro(inicio: string | Date, agora: Date = new Date()): string {
  const data = new Date(inicio);
  if (Number.isNaN(data.getTime())) return "";
  const hora = `às ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
  const dias = Math.round((inicioDoDia(data) - inicioDoDia(agora)) / (24 * 60 * 60 * 1000));
  if (dias === 0) return `hoje, ${hora}`;
  if (dias === 1) return `amanhã, ${hora}`;
  return `${DIAS_DA_SEMANA[data.getDay()]}, ${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}, ${hora}`;
}

export function encontroJaComecou(inicio: string | Date, agora: Date = new Date()): boolean {
  return new Date(inicio).getTime() <= agora.getTime();
}

/** Texto pronto para o organizador colar no grupo do clube. */
export function mensagemDoEncontro(dados: {
  nomeClube: string;
  titulo: string;
  inicio: string | Date;
  urlEvento?: string | null;
  link: string;
  agora?: Date;
}): string {
  const quando = quandoDoEncontro(dados.inicio, dados.agora);
  const linhas = [
    `📅 ${dados.nomeClube}`,
    `Encontro: ${dados.titulo}`,
    `Quando: ${quando.charAt(0).toUpperCase()}${quando.slice(1)}`,
  ];
  if (dados.urlEvento?.trim()) linhas.push(`Link do encontro: ${dados.urlEvento.trim()}`);
  linhas.push("", `Confirme sua presença: ${dados.link}`);
  return linhas.join("\n");
}

export interface PessoaDaPresenca {
  user_id: string;
  nome: string;
  resposta: RespostaAoEncontro | null;
}

const ORDEM_DA_RESPOSTA: Record<string, number> = { confirmado: 0, talvez: 1, sem: 2, recusado: 3 };

/** Quem confirmou vem primeiro, depois talvez, sem resposta e quem recusou; dentro de cada grupo, por nome. */
export function ordenarParaPresenca<T extends PessoaDaPresenca>(pessoas: T[]): T[] {
  return [...pessoas].sort(
    (a, b) =>
      ORDEM_DA_RESPOSTA[a.resposta ?? "sem"] - ORDEM_DA_RESPOSTA[b.resposta ?? "sem"] ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

/**
 * Lista que a tela mostra marcada ao abrir. Se a presença já foi gravada, vale
 * o que está gravado. Se ainda não, parte de quem confirmou, para o
 * organizador só ajustar.
 */
export function presencaInicial(
  pessoas: PessoaDaPresenca[],
  gravados: string[],
  jaFoiGravada: boolean,
): string[] {
  const doClube = new Set(pessoas.map((p) => p.user_id));
  if (jaFoiGravada) return gravados.filter((id) => doClube.has(id));
  return pessoas.filter((p) => p.resposta === "confirmado").map((p) => p.user_id);
}

/** "5 de 8 presentes", "1 de 8 presente", "Ninguém marcado". */
export function resumoDaPresenca(presentes: number, total: number): string {
  if (presentes <= 0) return "Ninguém marcado";
  return `${presentes} de ${total} ${presentes === 1 ? "presente" : "presentes"}`;
}

export function mesmaLista(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const conjunto = new Set(a);
  return b.every((id) => conjunto.has(id));
}

/** Problema da ata, ou nulo quando pode salvar. Ata vazia é válida: apaga a que existe. */
export function validarAta(texto: string): string | null {
  if (texto.trim().length > MAXIMO_ATA) return `A ata aceita até ${MAXIMO_ATA.toLocaleString("pt-BR")} caracteres.`;
  return null;
}

const ROTULO_DA_RESPOSTA: Record<RespostaAoEncontro, string> = {
  confirmado: "Confirmou",
  talvez: "Talvez",
  recusado: "Disse que não vai",
};

export function rotuloDaResposta(resposta: RespostaAoEncontro | null): string {
  return resposta ? ROTULO_DA_RESPOSTA[resposta] : "Sem resposta";
}
