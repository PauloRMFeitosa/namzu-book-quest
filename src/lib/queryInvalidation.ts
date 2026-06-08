import { QueryClient } from "@tanstack/react-query";

/**
 * Helpers centrais de invalidação de cache.
 *
 * Sempre que ocorrer uma alteração relevante no banco (gravação de
 * leitura, conclusão de livro, registro de XP, mudança em perfil_interesses,
 * etc.), chame um destes helpers para garantir que TODA a interface
 * (Home, Perfil, Código ME, Gamificação, Biblioteca, Clubes…) reflita
 * imediatamente o novo estado, sem necessidade de refresh manual.
 */

/** Queries diretamente vinculadas ao Código ME do Leitor. */
const CODIGO_ME_KEYS = [
  "perfil-interesses",
  "perfil-interesses-count",
];

/** Queries de gamificação (XP, nível, streak, missões, conquistas, ranking). */
const GAMIFICACAO_KEYS = [
  "gamificacao",
  "sequencia-leitura",
  "proxima-conquista",
  "desafio-mes",
  "missoes-diarias",
  "ranking-clube",
  "minhas-conquistas",
  "missoes-concluidas",
];

/** Queries de biblioteca / leituras / obras do usuário. */
const BIBLIOTECA_KEYS = [
  "meus-livros",
  "ultimas-leituras",
  "leituras-lendo",
  "meu-livro-obra",
  "livro-detalhe",
  "livro-experiencias",
  "obra-citacoes",
  "obra-estatisticas",
  "obra-avaliacoes",
  "perfil-livros",
  "perfil-insights",
  "minhas-leituras-lendo",
  "minhas-leituras-concluidos",
  "minhas-leituras-ultima-sessao",
  "minhas-leituras-stats",
];

/** Queries do perfil + clubes do usuário. */
const PERFIL_KEYS = ["perfil", "meus-clubes-ativos"];

const ALL_USER_KEYS = [
  ...CODIGO_ME_KEYS,
  ...GAMIFICACAO_KEYS,
  ...BIBLIOTECA_KEYS,
  ...PERFIL_KEYS,
];

const matcher = (keys: string[]) => (q: { queryKey: readonly unknown[] }) =>
  keys.includes(q.queryKey[0] as string);

/** Invalida tudo que depende de dados do usuário autenticado. */
export function invalidateUserData(qc: QueryClient) {
  qc.invalidateQueries({ predicate: matcher(ALL_USER_KEYS) });
}

/** Invalida apenas gamificação (XP, nível, streak, conquistas, missões, ranking). */
export function invalidateGamificacao(qc: QueryClient) {
  qc.invalidateQueries({ predicate: matcher(GAMIFICACAO_KEYS) });
}

/** Invalida biblioteca + gamificação (uso típico após registrar/alterar leituras). */
export function invalidateLeituras(qc: QueryClient) {
  qc.invalidateQueries({
    predicate: matcher([...BIBLIOTECA_KEYS, ...GAMIFICACAO_KEYS]),
  });
}

/** Invalida Código ME (após gravar/alterar perfil_interesses). */
export function invalidateCodigoMe(qc: QueryClient) {
  qc.invalidateQueries({ predicate: matcher(CODIGO_ME_KEYS) });
}
