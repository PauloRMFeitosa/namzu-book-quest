// Avisos do organizador para o clube (Fase 3). Lógica pura, testável sem React.

export const MAXIMO_TITULO_AVISO = 120;
export const MAXIMO_MENSAGEM_AVISO = 2000;

export interface AvisoDoClube {
  id: string;
  clube_id: string;
  titulo: string;
  mensagem: string;
  created_at: string;
}

/** Devolve a primeira coisa a corrigir, ou nulo quando o aviso pode ser enviado. */
export function validarAviso(titulo: string, mensagem: string): string | null {
  const t = titulo.trim();
  const m = mensagem.trim();
  if (!t) return "Dê um título para o aviso.";
  if (t.length > MAXIMO_TITULO_AVISO) return `O título passou de ${MAXIMO_TITULO_AVISO} letras.`;
  if (!m) return "Escreva a mensagem do aviso.";
  if (m.length > MAXIMO_MENSAGEM_AVISO) {
    return `A mensagem passou de ${MAXIMO_MENSAGEM_AVISO.toLocaleString("pt-BR")} caracteres.`;
  }
  return null;
}

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "hoje", "ontem", "há 3 dias" ou "12/11" para avisos com mais de uma semana. */
export function quandoDoAviso(criadoEm: string, agora: Date = new Date()): string {
  const data = new Date(criadoEm);
  if (Number.isNaN(data.getTime())) return "";
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias <= 7) return `há ${dias} dias`;
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}`;
}

/** Primeiras palavras da mensagem, em uma linha, para a faixa do clube. */
export function resumoDoAviso(mensagem: string, limite = 140): string {
  const emUmaLinha = mensagem.replace(/\s+/g, " ").trim();
  if (emUmaLinha.length <= limite) return emUmaLinha;
  const corte = emUmaLinha.slice(0, limite);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > limite * 0.6 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

/** Texto pronto para o organizador colar no grupo do clube. */
export function mensagemDoAviso(dados: { nomeClube: string; titulo: string; mensagem: string; link: string }): string {
  return [`📢 ${dados.nomeClube}`, dados.titulo.trim(), "", dados.mensagem.trim(), "", `No app: ${dados.link}`].join("\n");
}

export function textoDeAvisos(total: number): string {
  return total === 1 ? "1 aviso" : `${total} avisos`;
}
