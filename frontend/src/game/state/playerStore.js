import { create } from "zustand";

export const usePlayerStore = create((set) => ({
  health: 100,
  inventory: [],
  history: [],
  stats: {
    runsCompleted: 0,
    cardsUnlocked: 0,
    loreDiscovered: 0
  },
  setHealth: (health) => set({ health }),
  addInventoryItem: (item) =>
    set((state) => ({ inventory: [...state.inventory, item] })),
  appendHistory: (entry) =>
    set((state) => ({ history: [...state.history, entry] })),
  updateStats: (patch) =>
    set((state) => ({ stats: { ...state.stats, ...patch } }))
}));
