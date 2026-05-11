import { create } from "zustand";

const DEFAULT_COOLDOWN_MS = 5000;

export const useNpcStore = create((set, get) => ({
  npcStates: {},
  dialogueHistory: {},
  activeNpcId: null,
  isDialogueOpen: false,
  cooldownUntil: 0,
  setActiveNpc: (npcId) => set({ activeNpcId: npcId, isDialogueOpen: true }),
  closeDialogue: () => set({ isDialogueOpen: false }),
  dialogueMinimized: {},
  setDialogueMinimized: (npcId, value) =>
    set((state) => ({ dialogueMinimized: { ...(state.dialogueMinimized || {}), [npcId]: !!value } })),
  toggleDialogueMinimized: (npcId) =>
    set((state) => ({ dialogueMinimized: { ...(state.dialogueMinimized || {}), [npcId]: !state.dialogueMinimized?.[npcId] } })),
  setCooldown: (ms = DEFAULT_COOLDOWN_MS) =>
    set({ cooldownUntil: Date.now() + ms }),
  updateNpcState: (npcId, patch) =>
    set((state) => ({
      npcStates: {
        ...state.npcStates,
        [npcId]: { ...(state.npcStates[npcId] || {}), ...patch }
      }
    })),
  appendDialogue: (npcId, entry) =>
    set((state) => {
      const history = state.dialogueHistory[npcId] || [];
      return {
        dialogueHistory: {
          ...state.dialogueHistory,
          [npcId]: [...history, entry]
        }
      };
    }),
  canInteract: () => Date.now() >= get().cooldownUntil
}));
