// Grupo do clube no WhatsApp ou no Telegram: o link de convite que o
// organizador guarda e os membros usam para entrar. A regra do formato repete
// a do banco (migração clube_grupo).

export type TipoDeGrupo = "whatsapp" | "telegram";

const FORMATO = /^https:\/\/(chat\.whatsapp\.com|t\.me|telegram\.me)\/[A-Za-z0-9_+/?=&.-]+$/;
export const MAXIMO_LINK_DO_GRUPO = 200;

/** Acerta o que a pessoa colou: tira espaços e põe o https:// quando falta. */
export function limparLinkDoGrupo(texto: string): string {
  const limpo = (texto ?? "").trim().replace(/\s+/g, "");
  if (!limpo) return "";
  if (/^http:\/\//i.test(limpo)) return limpo.replace(/^http:\/\//i, "https://");
  if (/^(chat\.whatsapp\.com|t\.me|telegram\.me)\//i.test(limpo)) return `https://${limpo}`;
  return limpo;
}

/** WhatsApp ou Telegram, pelo endereço. Null quando não é link de grupo. */
export function tipoDoGrupo(link: string | null | undefined): TipoDeGrupo | null {
  if (!link || !FORMATO.test(link)) return null;
  return link.startsWith("https://chat.whatsapp.com/") ? "whatsapp" : "telegram";
}

/** Primeiro problema do link, ou null se pode salvar. Chame com o link já limpo. */
export function validarLinkDoGrupo(link: string): string | null {
  if (!link) return "Cole o link de convite do grupo.";
  if (link.length > MAXIMO_LINK_DO_GRUPO) return "O link está comprido demais. Confira se colou só o link de convite.";
  if (/wa\.me\//i.test(link)) return "Esse é o link de uma conversa, não de um grupo. No grupo, abra Convidar por link e copie o endereço que começa com chat.whatsapp.com.";
  if (!tipoDoGrupo(link)) return "Use o link de convite do grupo: no WhatsApp começa com chat.whatsapp.com, no Telegram com t.me.";
  return null;
}

export const nomeDoAplicativo = (tipo: TipoDeGrupo) => (tipo === "whatsapp" ? "WhatsApp" : "Telegram");

/** "Entrar no grupo do WhatsApp". */
export const rotuloDeEntrar = (tipo: TipoDeGrupo) => `Entrar no grupo do ${nomeDoAplicativo(tipo)}`;

/** Link que abre o WhatsApp com a mensagem pronta, para a pessoa escolher a conversa ou o grupo. */
export const linkParaEnviarNoWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;
