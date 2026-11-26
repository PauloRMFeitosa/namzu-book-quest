// Barra de abas da página do clube: quais ficam visíveis e quais vão para o
// botão "Mais". Lógica pura, testável sem React.

/** Abas que ficam sempre na barra, nesta ordem. As demais vão para "Mais". */
export const ABAS_PRINCIPAIS = ["visao", "feed", "leituras", "eventos", "membros"];

/** Lugares da barra no celular. Com "Mais", sobram cinco para abas. */
export const LUGARES_NA_BARRA = 6;

export interface DivisaoDasAbas<T> {
  naBarra: T[];
  emMais: T[];
}

/**
 * Divide as abas que a pessoa pode ver. Se todas cabem, ficam todas na barra.
 * Senão, ficam as principais e o resto vai para "Mais", na ordem em que veio.
 * Assim "Mais" nunca abre com uma aba só.
 */
export function dividirAbas<T extends { value: string }>(abas: T[]): DivisaoDasAbas<T> {
  if (abas.length <= LUGARES_NA_BARRA) return { naBarra: abas, emMais: [] };
  const vagas = LUGARES_NA_BARRA - 1;
  const principais = ABAS_PRINCIPAIS.map((v) => abas.find((a) => a.value === v)).filter((a): a is T => !!a);
  const resto = abas.filter((a) => !ABAS_PRINCIPAIS.includes(a.value));
  // Sobrando lugar (aba principal desligada por flag), puxa do resto.
  const promovidas = resto.slice(0, Math.max(0, vagas - principais.length));
  return { naBarra: [...principais, ...promovidas], emMais: resto.slice(promovidas.length) };
}
