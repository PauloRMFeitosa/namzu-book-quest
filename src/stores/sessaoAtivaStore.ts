import { create } from "zustand";

export type SessaoAtiva = {
  leituraId: string;
  usuarioLeituraId: string;
  clubeId?: string | null;
  titulo: string;
  autor?: string | null;
  capaUrl?: string | null;
  totalPaginas: number | null;
  paginasAnteriores: number;
  inicioMs: number;
  pausadoMs: number;
  pausadoEm: number | null;
};

type SessaoStore = {
  sessao: SessaoAtiva | null;
  modalAberto: boolean;
  /** true quando a sessão foi restaurada do localStorage após o app ser fechado/morto */
  recuperada: boolean;
  /** quanto tempo (ms) o app ficou fechado desde a última vez visível — usado na recuperação */
  tempoForaMs: number;
  iniciar: (dados: Omit<SessaoAtiva, "inicioMs" | "pausadoMs" | "pausadoEm">) => void;
  pausar: () => void;
  retomar: () => void;
  confirmarRecuperacao: (descontarTempoFora: boolean) => void;
  abrirModal: () => void;
  fecharModal: () => void;
  limpar: () => void;
};

const CHAVE_SESSAO = "namzu-sessao-leitura-ativa";

type SessaoPersistida = {
  sessao: SessaoAtiva;
  ultimaVezVisivelMs: number;
};

function lerSessaoPersistida(): SessaoPersistida | null {
  try {
    const raw = localStorage.getItem(CHAVE_SESSAO);
    if (!raw) return null;
    const dados = JSON.parse(raw) as SessaoPersistida;
    if (!dados?.sessao?.leituraId || typeof dados.sessao.inicioMs !== "number") return null;
    return dados;
  } catch {
    return null;
  }
}

function persistirSessao(sessao: SessaoAtiva | null) {
  try {
    if (!sessao) {
      localStorage.removeItem(CHAVE_SESSAO);
      return;
    }
    const dados: SessaoPersistida = { sessao, ultimaVezVisivelMs: Date.now() };
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(dados));
  } catch {
    // localStorage indisponível (modo privado, etc.) — segue sem persistência
  }
}

const persistida = typeof localStorage !== "undefined" ? lerSessaoPersistida() : null;

export const useSessaoAtiva = create<SessaoStore>((set) => ({
  sessao: persistida?.sessao ?? null,
  modalAberto: persistida !== null,
  recuperada: persistida !== null,
  tempoForaMs: persistida ? Math.max(0, Date.now() - persistida.ultimaVezVisivelMs) : 0,
  iniciar: (dados) => {
    const sessao: SessaoAtiva = { ...dados, inicioMs: Date.now(), pausadoMs: 0, pausadoEm: null };
    persistirSessao(sessao);
    set({ sessao, modalAberto: true, recuperada: false, tempoForaMs: 0 });
  },
  pausar: () =>
    set((s) => {
      if (!s.sessao || s.sessao.pausadoEm !== null) return s;
      const sessao = { ...s.sessao, pausadoEm: Date.now() };
      persistirSessao(sessao);
      return { sessao };
    }),
  retomar: () =>
    set((s) => {
      if (!s.sessao || s.sessao.pausadoEm === null) return s;
      const extras = Date.now() - s.sessao.pausadoEm;
      const sessao = { ...s.sessao, pausadoMs: s.sessao.pausadoMs + extras, pausadoEm: null };
      persistirSessao(sessao);
      return { sessao };
    }),
  confirmarRecuperacao: (descontarTempoFora) =>
    set((s) => {
      if (!s.sessao) return { recuperada: false, tempoForaMs: 0 };
      let sessao = s.sessao;
      // descontar só faz sentido se a sessão estava rodando — pausada já não conta o tempo fora
      if (descontarTempoFora && s.tempoForaMs > 0 && sessao.pausadoEm === null) {
        sessao = { ...sessao, pausadoMs: sessao.pausadoMs + s.tempoForaMs };
        persistirSessao(sessao);
      }
      return { sessao, recuperada: false, tempoForaMs: 0 };
    }),
  abrirModal: () => set({ modalAberto: true }),
  fecharModal: () => set({ modalAberto: false }),
  limpar: () => {
    persistirSessao(null);
    set({ sessao: null, modalAberto: false, recuperada: false, tempoForaMs: 0 });
  },
}));

// Regrava a sessão (com timestamp de visibilidade) sempre que o app vai para segundo
// plano — se o sistema matar o app com a tela bloqueada, sabemos quando ele "saiu"
// e conseguimos oferecer o desconto do tempo fora na recuperação.
if (typeof document !== "undefined") {
  const registrarSaida = () => {
    const { sessao } = useSessaoAtiva.getState();
    if (sessao) persistirSessao(sessao);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") registrarSaida();
  });
  window.addEventListener("pagehide", registrarSaida);
}
