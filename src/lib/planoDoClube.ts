// Plano que vale para um clube e quanto dos limites já foi usado
// (funções `clube_plano` e `meu_plano`). O banco é quem barra o que passa do
// limite; aqui fica só o que o app mostra antes disso.

export interface PlanoEmUso {
  chave: string;
  nome: string;
  descricao?: string | null;
  preco_mensal_centavos?: number;
  limite_membros: number | null;
  limite_clubes: number | null;
  limite_co_curadores?: number | null;
  limite_ia_mes?: number | null;
  recursos?: string[];
  padrao?: boolean;
}

/** Resposta de `clube_plano`. */
export interface PlanoDoClube {
  plano: PlanoEmUso | null;
  valido_ate: string | null;
  uso: { membros: number; co_curadores: number; clubes: number };
}

/** Resposta de `meu_plano`. */
export interface MeuPlano {
  plano: Pick<PlanoEmUso, "chave" | "nome" | "limite_membros" | "limite_clubes"> | null;
  clubes: number;
}

export type SituacaoDoLimite = "livre" | "perto" | "cheio" | "acima";

export interface UsoDoLimite {
  usado: number;
  /** Null quando o plano não limita. */
  limite: number | null;
  situacao: SituacaoDoLimite;
  /** "7 de 30", ou "7, sem limite". */
  texto: string;
  /** De 0 a 100, para a barra. Null quando não há limite. */
  percentual: number | null;
}

/** Compara o uso com o limite. "Perto" é a partir de 80% do limite. */
export function usoDoLimite(usado: number, limite: number | null | undefined): UsoDoLimite {
  if (limite === null || limite === undefined) {
    return { usado, limite: null, situacao: "livre", texto: `${usado.toLocaleString("pt-BR")}, sem limite`, percentual: null };
  }
  const situacao: SituacaoDoLimite =
    usado > limite ? "acima" : usado === limite ? "cheio" : limite > 0 && usado / limite >= 0.8 ? "perto" : "livre";
  return {
    usado,
    limite,
    situacao,
    texto: `${usado.toLocaleString("pt-BR")} de ${limite.toLocaleString("pt-BR")}`,
    percentual: limite === 0 ? 100 : Math.min(100, Math.round((usado / limite) * 100)),
  };
}

/** Aviso para a seção de membros quando o clube está no limite ou perto dele. Null quando há folga. */
export function avisoDeVagas(dados: PlanoDoClube | null | undefined): { texto: string; cheio: boolean } | null {
  if (!dados?.plano) return null;
  const uso = usoDoLimite(dados.uso.membros, dados.plano.limite_membros);
  if (uso.limite === null) return null;
  if (uso.situacao === "cheio" || uso.situacao === "acima") {
    return {
      cheio: true,
      texto: `O clube está com ${uso.texto} membros, o limite do plano ${dados.plano.nome}. Novas entradas e aprovações ficam bloqueadas até abrir vaga.`,
    };
  }
  if (uso.situacao === "perto") {
    const restam = uso.limite - uso.usado;
    return {
      cheio: false,
      texto: `O clube está com ${uso.texto} membros. ${restam === 1 ? "Resta 1 vaga" : `Restam ${restam} vagas`} no plano ${dados.plano.nome}.`,
    };
  }
  return null;
}

/** Por que a pessoa não pode criar outro clube, ou null se pode. */
export function bloqueioParaCriarClube(dados: MeuPlano | null | undefined): string | null {
  const limite = dados?.plano?.limite_clubes;
  if (!dados?.plano || limite === null || limite === undefined) return null;
  if (dados.clubes < limite) return null;
  const tem = dados.clubes === 1 ? "1 clube" : `${dados.clubes} clubes`;
  const permite = limite === 1 ? "1 clube" : `${limite} clubes`;
  return `O plano ${dados.plano.nome} permite organizar até ${permite}, e você já organiza ${tem}.`;
}

/** "até 31/12/2026", para plano com validade. */
export function textoDaValidade(validoAte: string | null | undefined): string | null {
  if (!validoAte) return null;
  const [ano, mes, dia] = validoAte.slice(0, 10).split("-");
  return `até ${dia}/${mes}/${ano}`;
}
