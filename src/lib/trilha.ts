// Inclusão de obra na trilha do clube. Lógica pura, testável sem React.
import { dividirEmSemanas, lerDia, type MetaRascunho } from "@/lib/cronograma";

export interface NovaObraNaTrilha {
  obraId: string | null;
  /** "AAAA-MM-DD" ou vazio. */
  inicio: string;
  fim: string;
  /** Já criar uma meta para cada semana do período. */
  criarMetasSemanais: boolean;
}

/** Devolve a primeira coisa a corrigir, ou nulo quando a obra pode entrar na trilha. */
export function validarNovaObra(dados: NovaObraNaTrilha, obrasNaTrilha: string[]): string | null {
  if (!dados.obraId) return "Escolha o livro que vai entrar na trilha.";
  if (obrasNaTrilha.includes(dados.obraId)) return "Este livro já está na trilha do clube.";
  if (dados.inicio && !lerDia(dados.inicio)) return "A data de início não é válida.";
  if (dados.fim && !lerDia(dados.fim)) return "A data de fim não é válida.";
  if (dados.inicio && dados.fim && dados.fim < dados.inicio) return "A data de fim não pode ser antes do início.";
  if (dados.criarMetasSemanais && !(dados.inicio && dados.fim)) {
    return "Para criar as metas semanais, informe o início e o fim da leitura.";
  }
  if (dados.criarMetasSemanais && metasSemanaisDaObra(dados).length === 0) {
    return "O período é longo demais para dividir em semanas. Ajuste as datas ou desmarque as metas semanais.";
  }
  return null;
}

/** As metas que serão criadas junto com a obra. Vazio quando a opção está desligada. */
export function metasSemanaisDaObra(dados: Pick<NovaObraNaTrilha, "inicio" | "fim" | "criarMetasSemanais">): MetaRascunho[] {
  if (!dados.criarMetasSemanais || !dados.inicio || !dados.fim) return [];
  return dividirEmSemanas(dados.inicio, dados.fim);
}

/** "4 metas, uma por semana" para o resumo antes de salvar. */
export function resumoDasMetas(total: number): string {
  if (total === 0) return "";
  return total === 1 ? "1 meta para o período" : `${total} metas, uma por semana`;
}
