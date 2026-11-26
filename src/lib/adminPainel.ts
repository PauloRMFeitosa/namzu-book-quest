// Painel do Admin: tipos e leitura dos números que vêm da função
// `admin_painel`. Lógica pura, testável sem React.

export interface TotaisDoPainel {
  usuarios: number;
  usuarios_novos: number;
  usuarios_ativos_7d: number;
  clubes_ativos: number;
  clubes_com_atividade_7d: number;
  membros_ativos: number;
  pedidos_pendentes: number;
  encontros_proximos: number;
  obras: number;
  erros_7d: number;
  denuncias_pendentes: number;
}

export interface ClubeNoPainel {
  id: string;
  nome: string;
  ativo: boolean;
  visibilidade: string | null;
  criado_em: string;
  organizador: string | null;
  membros: number;
  pendentes: number;
  livros_na_trilha: number;
  proximo_encontro: string | null;
  ultima_atividade: string | null;
  acoes_no_periodo: number;
}

export interface PainelDoAdmin {
  dias: number;
  totais: TotaisDoPainel;
  eventos_por_dia: { dia: string; total: number }[];
  eventos_por_tipo: { evento: string; total: number; clubes: number; pessoas: number }[];
  clubes: ClubeNoPainel[];
}

export type SituacaoDoClube = "em_uso" | "parado" | "sem_uso" | "desativado";

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Como o clube está, para o admin saber onde olhar:
 * em uso (teve ação nos últimos 7 dias), parado (já teve, não tem mais),
 * sem uso (nunca registrou ação) ou desativado.
 */
export function situacaoDoClube(clube: Pick<ClubeNoPainel, "ativo" | "ultima_atividade">, agora: Date = new Date()): SituacaoDoClube {
  if (!clube.ativo) return "desativado";
  if (!clube.ultima_atividade) return "sem_uso";
  const dias = (agora.getTime() - new Date(clube.ultima_atividade).getTime()) / DIA_MS;
  return dias <= 7 ? "em_uso" : "parado";
}

export const ROTULO_DA_SITUACAO: Record<SituacaoDoClube, string> = {
  em_uso: "Em uso",
  parado: "Parado",
  sem_uso: "Sem uso",
  desativado: "Desativado",
};

/** "hoje", "ontem", "há 5 dias", "há 3 semanas", "há 4 meses" ou "nunca". */
export function haQuantoTempo(quando: string | null | undefined, agora: Date = new Date()): string {
  if (!quando) return "nunca";
  const data = new Date(quando);
  if (Number.isNaN(data.getTime())) return "nunca";
  const inicio = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(agora) - inicio(data)) / DIA_MS);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 14) return `há ${dias} dias`;
  if (dias < 60) return `há ${Math.floor(dias / 7)} semanas`;
  return `há ${Math.floor(dias / 30)} meses`;
}

/** Nome legível de cada evento de produto. Evento novo sem nome aparece como veio. */
export const NOME_DO_EVENTO: Record<string, string> = {
  clube_criado: "Clube criado",
  convite_gerado: "Convite gerado",
  membro_entrou: "Membro entrou",
  progresso_registrado: "Progresso de leitura registrado",
  encontro_criado: "Encontro criado",
  rsvp_respondido: "Resposta a encontro",
  roteiro_ia_gerado: "Roteiro de IA gerado",
  membros_exportados: "Lista de membros exportada",
  cronograma_definido: "Cronograma definido",
  mensagem_meta_copiada: "Mensagem de meta copiada",
  lembrete_encontro_copiado: "Lembrete de encontro copiado",
  presenca_registrada: "Presença registrada",
  ata_salva: "Ata salva",
  votacao_data_aberta: "Votação de data aberta",
  voto_data_registrado: "Voto de data",
  votacao_data_encerrada: "Votação de data encerrada",
  aviso_enviado: "Aviso enviado",
  aviso_copiado: "Aviso copiado",
};

export const nomeDoEvento = (evento: string): string => NOME_DO_EVENTO[evento] ?? evento;

/** O que pede atenção agora, em ordem de urgência. Lista vazia quando está tudo em dia. */
export function pendenciasDoPainel(painel: PainelDoAdmin, agora: Date = new Date()): { texto: string; secao: string }[] {
  const t = painel.totais;
  const lista: { texto: string; secao: string }[] = [];
  const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);
  if (t.erros_7d > 0) lista.push({ texto: `${plural(t.erros_7d, "erro", "erros")} do app nos últimos 7 dias`, secao: "erros-app" });
  if (t.denuncias_pendentes > 0) {
    lista.push({ texto: `${plural(t.denuncias_pendentes, "denúncia ou sugestão", "denúncias ou sugestões")} sem resposta`, secao: "denuncias" });
  }
  if (t.pedidos_pendentes > 0) {
    lista.push({ texto: `${plural(t.pedidos_pendentes, "pedido de entrada", "pedidos de entrada")} aguardando organizador`, secao: "clubes" });
  }
  const parados = painel.clubes.filter((c) => situacaoDoClube(c, agora) === "parado").length;
  if (parados > 0) lista.push({ texto: `${plural(parados, "clube parado", "clubes parados")} há mais de 7 dias`, secao: "clubes" });
  const semUso = painel.clubes.filter((c) => situacaoDoClube(c, agora) === "sem_uso").length;
  if (semUso > 0) lista.push({ texto: `${plural(semUso, "clube ativo", "clubes ativos")} sem nenhuma ação registrada`, secao: "clubes" });
  return lista;
}

/** Maior valor da série, com mínimo de 1, para desenhar as barras. */
export const picoDaSerie = (serie: { total: number }[]): number => Math.max(1, ...serie.map((p) => p.total));
