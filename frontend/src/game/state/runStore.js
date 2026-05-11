import { create } from "zustand";

export const useRunStore = create((set) => ({
  runId: null,
  runSeed: null,
  phase: "idle",
  runStartTime: null,
  runEndTime: null,
  objectivesCompleted: 0,
  objectivesRequired: 3,
  objectives: [],
  extractionAvailable: false,
  result: null,
  reward: null,
  history: [],
  startRun: (runId, runSeed) =>
    set({
      runId,
      runSeed,
      phase: "exploring",
      runStartTime: Date.now(),
      runEndTime: null,
      objectivesCompleted: 0,
      objectives: [],
      extractionAvailable: false,
      result: null,
      reward: null,
      history: []
    }),
  setPhase: (phase) => set({ phase }),
  addObjective: (objective) =>
    set((state) => ({ objectives: [...state.objectives, objective] })),
  removeObjective: (objectiveId) =>
    set((state) => ({
      objectives: state.objectives.filter((objective) => objective.id !== objectiveId)
    })),
  completeObjective: (entry) =>
    set((state) => ({
      objectivesCompleted: state.objectivesCompleted + 1,
      history: [...state.history, entry]
    })),
  setExtractionAvailable: (value) => set({ extractionAvailable: value }),
  completeRun: (result) =>
    set((state) => ({ phase: "complete", result, runEndTime: Date.now() })),
  setReward: (reward) => set({ reward }),
  resetRun: () =>
    set({
      runId: null,
      runSeed: null,
      phase: "idle",
      runStartTime: null,
      runEndTime: null,
      objectivesCompleted: 0,
      objectives: [],
      extractionAvailable: false,
      result: null,
      reward: null,
      history: []
    }),
  logEvent: (event) =>
    set((state) => ({ history: [...state.history, event] }))
}));
