// Link de convite do clube (Fase 2). Lógica pura, testável sem React.

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RE_LINK = new RegExp(`/(?:convite|clubes)/(${UUID})`, "i");
const RE_UUID_PURO = new RegExp(`^${UUID}$`, "i");

/**
 * Extrai o id do clube de um link colado pelo usuário. Aceita o link novo
 * (/convite/:id), o link antigo do clube (/clubes/:id) e o id sozinho.
 */
export function extrairClubeDoConvite(texto: string): string | null {
  const limpo = (texto ?? "").trim();
  if (!limpo) return null;
  if (RE_UUID_PURO.test(limpo)) return limpo.toLowerCase();
  const m = limpo.match(RE_LINK);
  return m ? m[1].toLowerCase() : null;
}

export const caminhoConvite = (clubeId: string) => `/convite/${clubeId}`;

/**
 * Endereço completo do convite. Em produção usa sempre o domínio oficial,
 * para o link não sair com o endereço de um preview ou do app instalado.
 */
export function linkConvite(clubeId: string, origem?: string): string {
  const atual = origem ?? (typeof window !== "undefined" ? window.location.origin : "");
  const base = /(^|\.)namzu\.com\.br$/i.test(hostDe(atual)) ? "https://www.namzu.com.br" : atual;
  return `${base}${caminhoConvite(clubeId)}`;
}

function hostDe(origem: string): string {
  try {
    return new URL(origem).hostname;
  } catch {
    return "";
  }
}

/** Texto pronto para mandar no WhatsApp ou em outro mensageiro. */
export function mensagemConvite(nomeClube: string, link: string): string {
  return `Entre no nosso clube de leitura "${nomeClube}" pelo NAMZU: ${link}`;
}
