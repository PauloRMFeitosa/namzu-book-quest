// Papéis dentro do clube (Fase 3). Lógica pura, testável sem React.
//
// O organizador é quem criou o clube. O co-curador é um membro ativo nomeado
// por ele e faz o dia a dia. As mesmas regras valem no banco: o app só evita
// mostrar o que o banco recusaria.

export type PapelDeMembro = "membro" | "moderador" | "co_curador";

export const MAXIMO_CO_CURADORES = 3;

export interface PermissoesNoClube {
  /** Organizador: quem criou o clube. */
  ehDono: boolean;
  ehCoCurador: boolean;
  /** Dia a dia do clube: organizador, co-curador ou admin. */
  podeGerir: boolean;
  /** Nomear e tirar co-curadores: só organizador e admin. */
  podeNomear: boolean;
}

export function permissoesNoClube(dados: {
  userId: string | null | undefined;
  curadorId: string | null | undefined;
  papel: string | null | undefined;
  status: string | null | undefined;
  isAdmin: boolean;
}): PermissoesNoClube {
  const ehDono = !!dados.userId && !!dados.curadorId && dados.userId === dados.curadorId;
  const ehCoCurador = !ehDono && dados.status === "ativo" && dados.papel === "co_curador";
  return {
    ehDono,
    ehCoCurador,
    podeGerir: ehDono || ehCoCurador || dados.isAdmin,
    podeNomear: ehDono || dados.isAdmin,
  };
}

/** Nome do papel para a tela e para a planilha. */
export function rotuloDoPapel(papel: string | null | undefined, ehDono: boolean): string {
  if (ehDono) return "Organizador";
  if (papel === "co_curador") return "Co-curador";
  if (papel === "moderador") return "Moderador";
  return "Membro";
}

/**
 * Quem está olhando pode mudar o papel ou remover este membro? O co-curador
 * não mexe no organizador nem em outro co-curador. Ninguém mexe em si mesmo
 * por aqui.
 */
export function podeAlterarMembro(
  permissoes: PermissoesNoClube,
  alvo: { ehDono: boolean; papel: string | null | undefined; souEu: boolean },
): boolean {
  if (!permissoes.podeGerir || alvo.souEu || alvo.ehDono) return false;
  if (alvo.papel === "co_curador") return permissoes.podeNomear;
  return true;
}

/** Papéis que quem está olhando pode dar a um membro. */
export function papeisDisponiveis(
  permissoes: PermissoesNoClube,
  dados: { papelAtual: string | null | undefined; coCuradores: number },
): PapelDeMembro[] {
  const papeis: PapelDeMembro[] = ["membro", "moderador"];
  const jaEh = dados.papelAtual === "co_curador";
  if (permissoes.podeNomear && (jaEh || dados.coCuradores < MAXIMO_CO_CURADORES)) papeis.push("co_curador");
  return papeis;
}
