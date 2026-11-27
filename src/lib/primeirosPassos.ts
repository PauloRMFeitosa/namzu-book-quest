// Roteiro "Primeiros passos" do organizador: o que fazer depois de criar o
// clube, na ordem que deixa o clube pronto antes de os membros chegarem.
// Os passos se marcam sozinhos, a partir do que já existe no clube.

export type ChaveDoPasso = "livro" | "cronograma" | "encontro" | "pagina" | "convite" | "aviso";

/** O que o roteiro precisa saber do clube. */
export interface SituacaoDoClube {
  temLivro: boolean;
  temCronograma: boolean;
  temEncontro: boolean;
  /** A página pública está ligada. */
  paginaNoAr: boolean;
  /** O organizador já abriu a seção da página ou copiou o link neste aparelho. */
  viuAPagina: boolean;
  convidou: boolean;
  temAviso: boolean;
}

export type DestinoDoPasso =
  | { tipo: "secao"; secao: string }
  | { tipo: "rota"; rota: string }
  | { tipo: "convidar" };

export interface PassoDoRoteiro {
  chave: ChaveDoPasso;
  titulo: string;
  /** Para que serve, em uma frase. */
  explicacao: string;
  /** Texto do botão. */
  acao: string;
  destino: DestinoDoPasso;
  feito: boolean;
  opcional: boolean;
}

export function passosDoRoteiro(clubeId: string, s: SituacaoDoClube): PassoDoRoteiro[] {
  return [
    {
      chave: "livro",
      titulo: "Escolha o primeiro livro",
      explicacao: "A trilha organiza o que o clube lê e em que ordem. Quem entra já vê o livro da vez.",
      acao: "Adicionar livro",
      destino: { tipo: "rota", rota: `/clubes/${clubeId}/trilha/nova` },
      feito: s.temLivro,
      opcional: false,
    },
    {
      chave: "cronograma",
      titulo: "Defina o cronograma",
      explicacao: "As datas e metas mostram a cada membro até onde ler em cada semana.",
      acao: "Abrir a leitura",
      destino: { tipo: "secao", secao: "leitura" },
      feito: s.temCronograma,
      opcional: false,
    },
    {
      chave: "encontro",
      titulo: "Marque o primeiro encontro",
      explicacao: "Os membros confirmam presença e você acompanha quem vai. Se ainda não tem data, abra uma votação.",
      acao: "Abrir os encontros",
      destino: { tipo: "secao", secao: "encontros" },
      feito: s.temEncontro,
      opcional: false,
    },
    {
      chave: "pagina",
      titulo: s.paginaNoAr ? "Conheça a página pública do clube" : "Publique a página do clube",
      explicacao: s.paginaNoAr
        ? "Seu clube tem uma página aberta, sem login, para divulgar a quem ainda não conhece. Veja como ficou e copie o endereço."
        : "Uma página aberta, sem login, com o livro e os encontros, para divulgar o clube a quem ainda não conhece.",
      acao: s.paginaNoAr ? "Ver a página" : "Publicar a página",
      destino: { tipo: "secao", secao: "pagina" },
      feito: s.paginaNoAr && s.viuAPagina,
      opcional: false,
    },
    {
      chave: "convite",
      titulo: "Convide os membros",
      explicacao: "O convite é para quem você já conhece: a pessoa abre o link e entra. Dá para mandar pelo WhatsApp ou mostrar o QR code.",
      acao: "Convidar",
      destino: { tipo: "convidar" },
      feito: s.convidou,
      opcional: false,
    },
    {
      chave: "aviso",
      titulo: "Mande o primeiro aviso",
      explicacao: "Dê as boas-vindas e diga o que vem primeiro. Todos os membros recebem uma notificação.",
      acao: "Escrever aviso",
      destino: { tipo: "rota", rota: `/clubes/${clubeId}/avisos/novo` },
      feito: s.temAviso,
      opcional: true,
    },
  ];
}

export interface ProgressoDoRoteiro {
  /** Passos obrigatórios feitos. */
  feitos: number;
  /** Passos obrigatórios. */
  total: number;
  /** Todos os obrigatórios feitos. */
  pronto: boolean;
  /** Nada mais a fazer, nem o opcional. */
  completo: boolean;
  /** Primeiro passo por fazer, com os obrigatórios na frente. */
  proximo: PassoDoRoteiro | null;
}

export function progressoDoRoteiro(passos: PassoDoRoteiro[]): ProgressoDoRoteiro {
  const obrigatorios = passos.filter((p) => !p.opcional);
  const feitos = obrigatorios.filter((p) => p.feito).length;
  const pendentes = passos.filter((p) => !p.feito);
  return {
    feitos,
    total: obrigatorios.length,
    pronto: feitos === obrigatorios.length,
    completo: pendentes.length === 0,
    proximo: pendentes.find((p) => !p.opcional) ?? pendentes[0] ?? null,
  };
}

/** "3 de 5 passos". */
export const textoDoProgresso = (p: Pick<ProgressoDoRoteiro, "feitos" | "total">) => `${p.feitos} de ${p.total} passos`;

/** Monta a situação a partir do que o painel já carrega. Dado que ainda não chegou conta como não feito. */
export function situacaoDoClube(dados: {
  livroAtual?: { data_inicio: string | null; data_fim: string | null } | null;
  temMeta?: boolean;
  proximoEncontro?: unknown | null;
  encontrosRealizados?: number;
  votacaoAberta?: boolean;
  paginaNoAr?: boolean;
  viuAPagina?: boolean;
  membrosAtivos?: number;
  pedidosPendentes?: number;
  gerouConvite?: boolean;
  avisos?: number;
}): SituacaoDoClube {
  const livro = dados.livroAtual ?? null;
  return {
    temLivro: !!livro,
    temCronograma: !!livro && (!!dados.temMeta || (!!livro.data_inicio && !!livro.data_fim)),
    temEncontro: !!dados.proximoEncontro || !!dados.votacaoAberta || (dados.encontrosRealizados ?? 0) > 0,
    paginaNoAr: !!dados.paginaNoAr,
    viuAPagina: !!dados.viuAPagina,
    // Além do organizador, já há alguém no clube ou pedindo para entrar.
    convidou: !!dados.gerouConvite || (dados.membrosAtivos ?? 0) > 1 || (dados.pedidosPendentes ?? 0) > 0,
    temAviso: (dados.avisos ?? 0) > 0,
  };
}

// O que só o aparelho sabe: se o organizador dispensou o roteiro, gerou um
// convite ou já viu a página. Fica no navegador; em outro aparelho o roteiro
// volta a se guiar só pelo que existe no clube.

export type MarcaDoRoteiro = "dispensado" | "convite" | "pagina";

export const chaveDaMarca = (clubeId: string, marca: MarcaDoRoteiro) => `namzu-roteiro-${marca}-${clubeId}`;

export function lerMarca(clubeId: string, marca: MarcaDoRoteiro): boolean {
  try {
    return localStorage.getItem(chaveDaMarca(clubeId, marca)) === "1";
  } catch {
    return false;
  }
}

export function gravarMarca(clubeId: string, marca: MarcaDoRoteiro, valor = true): void {
  try {
    if (valor) localStorage.setItem(chaveDaMarca(clubeId, marca), "1");
    else localStorage.removeItem(chaveDaMarca(clubeId, marca));
    window.dispatchEvent(new Event("namzu-roteiro"));
  } catch {
    /* sem armazenamento, o roteiro só não lembra */
  }
}
