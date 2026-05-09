import { create } from "zustand";

export const useUiStore = create((set) => ({
  isJournalOpen: false,
  isCardViewerOpen: false,
  isObjectiveOpen: true,
  toggleJournal: () => set((state) => ({ isJournalOpen: !state.isJournalOpen })),
  toggleCardViewer: () =>
    set((state) => ({ isCardViewerOpen: !state.isCardViewerOpen })),
  toggleObjective: () =>
    set((state) => ({ isObjectiveOpen: !state.isObjectiveOpen }))
}));
