import { useEffect } from "react";
import { useWorldStore } from "../state/worldStore";
import { requestDirectorUpdate } from "../ai/directorApi";
import { pickLocationTarget } from "../data/locationTargets";
import { useRunStore } from "../state/runStore";
import { pickExtractionTarget } from "../data/extractionTargets";

export default function RunOrchestrator() {
  const worldState = useWorldStore((state) => state.world);
  const patchWorld = useWorldStore((state) => state.patchWorld);
  const addActiveEvent = useWorldStore((state) => state.addActiveEvent);
  const objectiveTargets = useWorldStore((state) => state.world.objectiveTargets || []);
  const setObjectiveTargets = useWorldStore((state) => state.setObjectiveTargets);
  const setExtractionTarget = useWorldStore((state) => state.setExtractionTarget);
  const startRun = useRunStore((state) => state.startRun);
  const objectivesCompleted = useRunStore((state) => state.objectivesCompleted);
  const objectivesRequired = useRunStore((state) => state.objectivesRequired);
  const extractionAvailable = useRunStore((state) => state.extractionAvailable);
  const setExtractionAvailable = useRunStore((state) => state.setExtractionAvailable);

  useEffect(() => {
    if (!worldState.runSeed) {
      const seed = Math.floor(Date.now() % 100000);
      patchWorld({ runSeed: seed });
      startRun(`run_${seed}`, seed);
    }
  }, [patchWorld, startRun, worldState.runSeed]);

  useEffect(() => {
    let timerId = null;

    async function tick() {
      try {
        const recentEvents = (worldState.activeEvents || []).slice(-6);
        const director = await requestDirectorUpdate(worldState, [], recentEvents);
        console.info("[Director] Update", director);
        patchWorld({
          weather: director.weather,
          dangerLevel: Math.max(0, worldState.dangerLevel + director.adjustments.dangerDelta),
          corruption: Math.max(0, worldState.corruption + director.adjustments.corruptionDelta)
        });

        addActiveEvent({
          id: director.nextEvent.spawnEvent,
          location: director.nextEvent.location,
          startedAt: new Date().toISOString()
        });
        console.info("[Director] Event queued", director.nextEvent);

        if (objectiveTargets.length < 5) {
          const target = pickLocationTarget(director.nextEvent.location);
          if (target) {
            const exists = objectiveTargets.some(
              (existing) =>
                existing.location === target.location &&
                existing.position?.x === target.position?.x &&
                existing.position?.z === target.position?.z
            );
            if (!exists) {
              const nextTarget = {
                id: `obj_${Date.now()}_${objectiveTargets.length}`,
                ...target
              };
              setObjectiveTargets([...objectiveTargets, nextTarget]);
            }
          }
        }

        if (!extractionAvailable && objectivesCompleted >= objectivesRequired) {
          const extraction = pickExtractionTarget();
          if (extraction) {
            setExtractionTarget(extraction);
            setExtractionAvailable(true);
          }
        }
      } catch (error) {
        console.warn("Director update failed", error);
      }
    }

    timerId = window.setInterval(tick, 15000);
    return () => window.clearInterval(timerId);
  }, [
    addActiveEvent,
    patchWorld,
    setObjectiveTargets,
    setExtractionAvailable,
    setExtractionTarget,
    objectivesCompleted,
    objectivesRequired,
    extractionAvailable,
    objectiveTargets,
    worldState
  ]);

  return null;
}
