import { useEffect, useMemo, useRef, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { useRunStore } from "../state/runStore";
import { pickObjectiveType } from "../data/objectives";

export default function ObjectiveManager({ playerCoords }) {
  const world = useWorldStore((state) => state.world);
  const patchWorld = useWorldStore((state) => state.patchWorld);
  const removeObjectiveTarget = useWorldStore((state) => state.removeObjectiveTarget);

  const objectives = useRunStore((state) => state.objectives);
  const addObjective = useRunStore((state) => state.addObjective);
  const removeObjective = useRunStore((state) => state.removeObjective);
  const completeObjective = useRunStore((state) => state.completeObjective);
  const logEvent = useRunStore((state) => state.logEvent);

  const [promptVisible, setPromptVisible] = useState(false);
  const [completionText, setCompletionText] = useState(null);
  const timerRef = useRef(null);

  const objectiveTargets = world?.objectiveTargets || [];

  const nearestObjective = useMemo(() => {
    if (!objectiveTargets.length || !playerCoords) return null;
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    objectiveTargets.forEach((target) => {
      if (!target?.position) return;
      const dx = target.position.x - playerCoords.x;
      const dy = target.position.y - playerCoords.y;
      const dz = target.position.z - playerCoords.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { target, distance };
      }
    });
    return best;
  }, [objectiveTargets, playerCoords]);

  useEffect(() => {
    objectiveTargets.forEach((target, index) => {
      if (objectives.some((objective) => objective.target?.id === target.id)) {
        return;
      }
      const objectiveType = pickObjectiveType(
        world.runSeed + index + (world.activeEvents?.length || 0)
      );
      if (objectiveType) {
        addObjective({
          ...objectiveType,
          target,
          startedAt: new Date().toISOString()
        });
      }
    });
  }, [addObjective, objectiveTargets, objectives, world]);

  useEffect(() => {
    const objective = objectives.find((entry) => entry.target?.id === nearestObjective?.target?.id);
    if (!objective || !nearestObjective) {
      setPromptVisible(false);
      return;
    }

    const inRange = nearestObjective.distance <= objective.radius;
    setPromptVisible(inRange);

    if (inRange && objective.timerSeconds && !timerRef.current) {
      timerRef.current = window.setTimeout(() => {
        handleComplete(objective);
      }, objective.timerSeconds * 1000);
    }

    if (!inRange && timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [nearestObjective, objectives]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "e") return;
      if (!promptVisible) return;
      const objective = objectives.find(
        (entry) => entry.target?.id === nearestObjective?.target?.id
      );
      if (!objective?.requiresInteraction) return;
      event.preventDefault();
      handleComplete(objective);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearestObjective, objectives, promptVisible]);

  const handleComplete = (objective) => {
    if (!objective) return;

    const entry = {
      type: "objective_complete",
      objectiveId: objective.id,
      label: objective.label,
      location: objective.target?.location,
      timestamp: new Date().toISOString()
    };

    completeObjective(entry);
    logEvent(entry);
    removeObjective(objective.id);
    removeObjectiveTarget(objective.target?.id);

    patchWorld({
      dangerLevel: Math.max(0, world.dangerLevel + objective.dangerDelta),
      corruption: Math.max(0, world.corruption + objective.corruptionDelta)
    });

    setCompletionText(`${objective.label} completed`);
    window.setTimeout(() => setCompletionText(null), 2500);
    timerRef.current = null;
  };

  return (
    <>
      {promptVisible && (
        <div className="objective-prompt">Press E to investigate</div>
      )}
      {completionText && <div className="objective-popup">{completionText}</div>}
    </>
  );
}
