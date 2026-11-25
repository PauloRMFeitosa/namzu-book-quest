// Contexto que acompanha o visitante entre a página pública, o convite e as
// telas de cadastro e login, via `location.state`.
export type ContextoEntrada =
  | { tipo: "criar-clube" }
  | { tipo: "convite"; nomeClube: string };

export interface EstadoEntrada {
  returnTo?: string;
  contexto?: ContextoEntrada;
}

/** Frase de apoio do cadastro e do login conforme de onde a pessoa veio. */
export function fraseDeEntrada(contexto: ContextoEntrada | undefined, padrao: string): string {
  if (contexto?.tipo === "convite") return `Para entrar no clube ${contexto.nomeClube}`;
  if (contexto?.tipo === "criar-clube") return "Para criar o seu clube de leitura";
  return padrao;
}
