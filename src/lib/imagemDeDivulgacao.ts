// Imagens de divulgação do clube (encontro e trilha), para compartilhar no
// WhatsApp, nos stories e no feed. Aqui fica o que não depende de tela.

export type FormatoDaImagem = "stories" | "feed";

export const FORMATOS: Record<FormatoDaImagem, { rotulo: string; largura: number; altura: number }> = {
  feed: { rotulo: "Feed e WhatsApp", largura: 1080, altura: 1350 },
  stories: { rotulo: "Stories", largura: 1080, altura: 1920 },
};

const FUSO = "America/Sao_Paulo";

/** Partes da data do encontro para a imagem: dia grande, mês curto, dia da semana e hora. */
export function dataDoEncontroNaImagem(iso: string, fuso: string = FUSO) {
  const data = new Date(iso);
  const parte = (opcoes: Intl.DateTimeFormatOptions) => data.toLocaleDateString("pt-BR", { timeZone: fuso, ...opcoes });
  const hora = data
    .toLocaleTimeString("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" })
    .replace(":", "h")
    .replace(/h00$/, "h");
  return {
    dia: parte({ day: "2-digit" }),
    mes: parte({ month: "short" }).replace(".", "").toUpperCase(),
    semana: parte({ weekday: "long" }),
    hora,
  };
}

/** Nome do arquivo baixado: "encontro-leitoras-do-cariri.png". */
export function nomeDoArquivo(tipo: "encontro" | "trilha", nomeClube: string): string {
  const clube = (nomeClube ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${tipo}-${clube || "clube"}.png`;
}

/** Título longo demais para a imagem é cortado em palavra inteira. */
export function cortarParaAImagem(texto: string, maximo: number): string {
  const limpo = (texto ?? "").replace(/\s+/g, " ").trim();
  if (limpo.length <= maximo) return limpo;
  const corte = limpo.slice(0, maximo - 1);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > maximo * 0.6 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

/** Livros da trilha para a imagem: o atual e os próximos (até três), sem os já lidos. */
export function livrosParaAImagem<T extends { id: string }>(trilha: T[], atualId: string | null | undefined): { atual: T | null; proximos: T[] } {
  if (trilha.length === 0) return { atual: null, proximos: [] };
  const indice = Math.max(0, trilha.findIndex((t) => t.id === atualId));
  return { atual: trilha[indice], proximos: trilha.slice(indice + 1, indice + 4) };
}
