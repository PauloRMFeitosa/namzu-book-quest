import { create } from "zustand";

interface CanalUIState {
  canalSelecionado: Record<string, string | null>; // clubeId -> canalId
  drafts: Record<string, string>; // canalId -> draft
  replyTo: Record<string, { id: string; preview: string } | null>; // canalId -> mensagem
  setCanalSelecionado: (clubeId: string, canalId: string | null) => void;
  setDraft: (canalId: string, value: string) => void;
  setReplyTo: (canalId: string, ref: { id: string; preview: string } | null) => void;
}

export const useCanalUIStore = create<CanalUIState>((set) => ({
  canalSelecionado: {},
  drafts: {},
  replyTo: {},
  setCanalSelecionado: (clubeId, canalId) =>
    set((s) => ({ canalSelecionado: { ...s.canalSelecionado, [clubeId]: canalId } })),
  setDraft: (canalId, value) =>
    set((s) => ({ drafts: { ...s.drafts, [canalId]: value } })),
  setReplyTo: (canalId, ref) =>
    set((s) => ({ replyTo: { ...s.replyTo, [canalId]: ref } })),
}));
