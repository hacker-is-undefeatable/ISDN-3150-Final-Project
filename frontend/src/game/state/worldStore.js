import { create } from "zustand";
import { initialWorldState, mergeWorldState } from "../world/worldState";

export const useWorldStore = create((set) => ({
  world: initialWorldState,
  setWorld: (next) => set({ world: next }),
  patchWorld: (patch) =>
    set((state) => ({
      world: mergeWorldState(state.world, patch)
    })),
  setObjectiveTarget: (target) =>
    set((state) => ({
      world: {
        ...state.world,
        objectiveTargets: target ? [target] : []
      }
    })),
  setObjectiveTargets: (targets) =>
    set((state) => ({
      world: {
        ...state.world,
        objectiveTargets: targets || []
      }
    })),
  removeObjectiveTarget: (targetId) =>
    set((state) => ({
      world: {
        ...state.world,
        objectiveTargets: (state.world.objectiveTargets || []).filter(
          (target) => target.id !== targetId
        )
      }
    })),
  setExtractionTarget: (target) =>
    set((state) => ({
      world: {
        ...state.world,
        extractionTarget: target
      }
    })),
  addActiveEvent: (event) =>
    set((state) => ({
      world: {
        ...state.world,
        activeEvents: [...state.world.activeEvents, event]
      }
    }))
}));
