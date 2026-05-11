import { useMemo } from "react";
import { useWorldStore } from "../state/worldStore";
import { useRunStore } from "../state/runStore";
import { useUiStore } from "../state/uiStore";

export default function RunObjectivePanel() {
  const world = useWorldStore((state) => state.world);
  const runPhase = useRunStore((state) => state.phase);
  const objectivesCompleted = useRunStore((state) => state.objectivesCompleted);
  const objectivesRequired = useRunStore((state) => state.objectivesRequired);
  const isOpen = useUiStore((state) => state.isObjectiveOpen);
  const toggleObjective = useUiStore((state) => state.toggleObjective);

  const targetCount = world?.objectiveTargets?.length || 0;

  const objectiveText = useMemo(() => {
    if (runPhase === "complete") {
      return "Run complete. Review your reward in the journal.";
    }

    if (world?.storyObjective?.hint) {
      return world.storyObjective.hint;
    }

    if (world?.corruption >= 70) {
      return "High corruption detected. Seek a safe exit or counter the corruption.";
    }

    if (world?.dangerLevel >= 7) {
      return "Threat level rising. Avoid dense areas and watch for anomalies.";
    }

    return "Explore the marked locations and investigate anomalies to progress the expedition.";
  }, [runPhase, world?.corruption, world?.dangerLevel, world?.storyObjective?.hint]);

  if (!isOpen) {
    return (
      <button className="objective-toggle" onClick={toggleObjective}>
        Show Objectives
      </button>
    );
  }

  return (
    <aside className="objective-panel">
      <div className="objective-panel__header">
        <h3>Run Objective</h3>
        <button className="objective-toggle" onClick={toggleObjective}>
          Hide
        </button>
      </div>
      <p className="objective-panel__text">{objectiveText}</p>
      <div className="objective-panel__meta">
        <span>Objectives: {objectivesCompleted}/{objectivesRequired}</span>
        <span>Active Targets: {targetCount}</span>
        <span>Weather: {world.weather}</span>
        <span>Danger: {world.dangerLevel}</span>
        <span>Corruption: {world.corruption}</span>
      </div>
    </aside>
  );
}
