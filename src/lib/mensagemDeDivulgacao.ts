// Mensagem que acompanha o link do convite ou da página pública quando o
// organizador manda pelo WhatsApp. O organizador pode editar o texto; o link
// entra sempre no fim.

export const MAXIMO_MENSAGEM_DE_DIVULGACAO = 500;

export type TipoDeMensagem = "pagina" | "convite";

export function textoPadraoDaMensagem(tipo: TipoDeMensagem, nomeClube: string): string {
  return tipo === "pagina"
    ? `Conheça o nosso clube de leitura "${nomeClube}":`
    : `Entre no nosso clube de leitura "${nomeClube}" pelo NAMZU:`;
}

/** Texto e link em uma mensagem só. Se a pessoa já colou o link no texto, ele não é repetido. */
export function montarMensagem(texto: string, link: string): string {
  const limpo = (texto ?? "").trim();
  if (!limpo) return link;
  if (limpo.includes(link)) return limpo;
  return `${limpo} ${link}`;
}

export const chaveDaMensagem = (tipo: TipoDeMensagem, clubeId: string) => `mensagem-${tipo}-${clubeId}`;

/** Texto guardado neste aparelho para o clube, ou o padrão. */
export function lerMensagem(tipo: TipoDeMensagem, clubeId: string, nomeClube: string): string {
  try {
    const guardado = localStorage.getItem(chaveDaMensagem(tipo, clubeId));
    if (typeof guardado === "string" && guardado.trim()) return guardado.slice(0, MAXIMO_MENSAGEM_DE_DIVULGACAO);
  } catch {
    /* sem armazenamento, vale o padrão */
  }
  return textoPadraoDaMensagem(tipo, nomeClube);
}

/** Guarda o texto editado. Igual ao padrão ou vazio, apaga o que estava guardado. */
export function gravarMensagem(tipo: TipoDeMensagem, clubeId: string, nomeClube: string, texto: string): void {
  try {
    const chave = chaveDaMensagem(tipo, clubeId);
    if (!texto.trim() || texto === textoPadraoDaMensagem(tipo, nomeClube)) localStorage.removeItem(chave);
    else localStorage.setItem(chave, texto.slice(0, MAXIMO_MENSAGEM_DE_DIVULGACAO));
  } catch {
    /* sem armazenamento, a edição vale só enquanto a tela está aberta */
  }
}
