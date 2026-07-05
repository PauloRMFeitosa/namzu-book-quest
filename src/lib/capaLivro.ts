/**
 * Resolve qual capa exibir para um livro.
 *
 * A capa da obra (`obras.capa_padrao_url`) é a fonte curada — é ela que o
 * admin atualiza e que o restante do app (busca, feed, citações, estante)
 * já exibe. A capa da edição (`edicoes.capa_url`) é só um fallback, pois
 * pode ficar desatualizada ou apontar para URLs inválidas importadas de
 * fontes externas.
 */
export function resolverCapa(
  capaObra?: string | null,
  capaEdicao?: string | null,
): string | null {
  return capaObra?.trim() || capaEdicao?.trim() || null;
}
