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

// ─── Visitante (sem sessão) ────────────────────────────────────────────────

export type RotaVisitante =
  | { tipo: "pagina-publica" }
  | { tipo: "redirecionar"; para: string; guardarRetorno: boolean };

interface FlagsEntrada {
  show_entrada_organizador: boolean;
  show_onboarding: boolean;
}

const RE_CLUBE = /^\/clubes\/([^/]+)\/?$/;

/**
 * Para onde vai quem abre uma rota protegida sem estar logado.
 * Com a entrada do organizador ligada: a raiz mostra a página pública, o link
 * antigo de um clube vira o convite dele e o resto pede login direto.
 * Com ela desligada, vale o comportamento antigo (quiz ou login).
 */
export function rotaVisitante(pathname: string, flags: FlagsEntrada): RotaVisitante {
  if (flags.show_entrada_organizador) {
    if (pathname === "/") return { tipo: "pagina-publica" };
    const clube = pathname.match(RE_CLUBE);
    if (clube) return { tipo: "redirecionar", para: `/convite/${clube[1]}`, guardarRetorno: false };
    return { tipo: "redirecionar", para: "/login", guardarRetorno: true };
  }
  return { tipo: "redirecionar", para: flags.show_onboarding ? "/comecar" : "/login", guardarRetorno: true };
}

/** Para onde vai quem acabou de sair da conta. */
export function destinoAoSair(flags: FlagsEntrada): string {
  if (flags.show_entrada_organizador) return "/";
  return flags.show_onboarding ? "/comecar" : "/login";
}
