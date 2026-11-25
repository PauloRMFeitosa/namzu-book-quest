// Navegação da Fase 2 (Foco): o membro tem três destinos.
// A lógica fica aqui, sem React, para poder ser testada isoladamente.

export type DestinoFoco = "clube" | "leitura" | "perfil";

export interface ItemNavegacaoFoco {
  destino: DestinoFoco;
  to: string;
  label: string;
}

export const ITENS_NAVEGACAO_FOCO: ItemNavegacaoFoco[] = [
  { destino: "clube", to: "/", label: "Meu clube" },
  { destino: "leitura", to: "/leituras", label: "Minha leitura" },
  { destino: "perfil", to: "/perfil", label: "Perfil" },
];

// Prefixos de rota que pertencem a cada destino. "/perfis" (perfil de outra
// pessoa) fica de fora de propósito: não é o perfil do próprio usuário.
const PREFIXOS: Record<DestinoFoco, string[]> = {
  clube: ["/clubes"],
  leitura: ["/leituras", "/livros", "/citacoes", "/busca", "/obras", "/autores", "/cadastro-manual"],
  perfil: ["/perfil", "/configuracoes", "/metas", "/historico"],
};

const pertence = (pathname: string, prefixo: string) =>
  pathname === prefixo || pathname.startsWith(prefixo + "/");

/** Qual dos três destinos deve aparecer marcado para a rota atual. */
export function destinoAtivo(pathname: string): DestinoFoco | null {
  if (pathname === "/") return "clube";
  for (const destino of Object.keys(PREFIXOS) as DestinoFoco[]) {
    if (PREFIXOS[destino].some((p) => pertence(pathname, p))) return destino;
  }
  return null;
}

/** Rotas em que as abas de "Minha leitura" (Lendo, Estante, Citações) aparecem. */
export const ROTAS_ABAS_MINHA_LEITURA = ["/leituras", "/livros", "/citacoes"];

export function mostraAbasMinhaLeitura(pathname: string): boolean {
  return ROTAS_ABAS_MINHA_LEITURA.includes(pathname);
}

/** Itens visíveis conforme as flags. Admin vê todos. */
export function itensVisiveisFoco(
  flags: { show_clubes: boolean; show_leituras: boolean; pages_global_visible: boolean },
  isAdmin: boolean
): ItemNavegacaoFoco[] {
  if (isAdmin) return ITENS_NAVEGACAO_FOCO;
  return ITENS_NAVEGACAO_FOCO.filter((i) => {
    if (i.destino === "perfil") return true;
    if (!flags.pages_global_visible) return false;
    if (i.destino === "clube") return flags.show_clubes;
    if (i.destino === "leitura") return flags.show_leituras;
    return true;
  });
}
