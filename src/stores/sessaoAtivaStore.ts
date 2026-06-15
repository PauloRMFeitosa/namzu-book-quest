import { create } from "zustand";

export type SessaoAtiva = {
  leituraId: string;
  usuarioLeituraId: string;
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
  iniciar: (dados: Omit<SessaoAtiva, "inicioMs" | "pausadoMs" | "pausadoEm">) => void;
  pausar: () => void;
  retomar: () => void;
  abrirModal: () => void;
  fecharModal: () => void;
  limpar: () => void;
};

export const useSessaoAtiva = create<SessaoStore>((set) => ({
  sessao: null,
  modalAberto: false,
  iniciar: (dados) =>
    set({ sessao: { ...dados, inicioMs: Date.now(), pausadoMs: 0, pausadoEm: null }, modalAberto: true }),
  pausar: () =>
    set((s) => {
      if (!s.sessao || s.sessao.pausadoEm !== null) return s;
      return { sessao: { ...s.sessao, pausadoEm: Date.now() } };
    }),
  retomar: () =>
    set((s) => {
      if (!s.sessao || s.sessao.pausadoEm === null) return s;
      const extras = Date.now() - s.sessao.pausadoEm;
      return { sessao: { ...s.sessao, pausadoMs: s.sessao.pausadoMs + extras, pausadoEm: null } };
    }),
  abrirModal: () => set({ modalAberto: true }),
  fecharModal: () => set({ modalAberto: false }),
  limpar: () => set({ sessao: null, modalAberto: false }),
}));
