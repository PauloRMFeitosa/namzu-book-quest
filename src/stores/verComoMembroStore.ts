import { create } from "zustand";
import { persist } from "zustand/middleware";

// "Ver como membro": o admin desliga temporariamente o próprio atalho de admin
// na interface para enxergar o app como um usuário comum (flags valem para ele).
// É só visual: as permissões no banco não mudam.
type VerComoMembroStore = {
  ativo: boolean;
  definir: (ativo: boolean) => void;
};

export const useVerComoMembro = create<VerComoMembroStore>()(
  persist(
    (set) => ({
      ativo: false,
      definir: (ativo) => set({ ativo }),
    }),
    { name: "namzu-ver-como-membro" }
  )
);
