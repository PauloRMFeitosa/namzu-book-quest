import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Ritmo = "lento" | "moderado" | "intenso";
export type Objetivo = "ler_mais" | "descobrir" | "comunidade";

interface OnboardingState {
  generos: string[];
  livrosAmados: string[];
  /** IDs dos clubes que o usuário manteve selecionados na T5. */
  clubesSelecionados: string[];
  ritmo: Ritmo | null;
  objetivo: Objetivo | null;
  etapaAtual: number;
  setGeneros: (generos: string[]) => void;
  setLivrosAmados: (ids: string[]) => void;
  setClubesSelecionados: (ids: string[]) => void;
  setRitmo: (ritmo: Ritmo) => void;
  setObjetivo: (objetivo: Objetivo) => void;
  setEtapaAtual: (etapa: number) => void;
  limpar: () => void;
}

const ESTADO_INICIAL = {
  generos: [] as string[],
  livrosAmados: [] as string[],
  clubesSelecionados: [] as string[],
  ritmo: null as Ritmo | null,
  objetivo: null as Objetivo | null,
  etapaAtual: 1,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...ESTADO_INICIAL,
      setGeneros: (generos) => set({ generos }),
      setLivrosAmados: (livrosAmados) => set({ livrosAmados }),
      setClubesSelecionados: (clubesSelecionados) => set({ clubesSelecionados }),
      setRitmo: (ritmo) => set({ ritmo }),
      setObjetivo: (objetivo) => set({ objetivo }),
      setEtapaAtual: (etapaAtual) => set({ etapaAtual }),
      limpar: () => set(ESTADO_INICIAL),
    }),
    { name: "namzu_onboarding" }
  )
);

// Lê localStorage diretamente — sem React, sem re-render.
// Usado fora de componentes (auto-merge, guards de rota).
export const temDadosDeOnboarding = (): boolean => {
  try {
    const raw = localStorage.getItem("namzu_onboarding");
    if (!raw) return false;
    const state = JSON.parse(raw)?.state;
    return state?.generos?.length > 0 || state?.objetivo != null;
  } catch {
    return false;
  }
};
