import { useEffect, useMemo, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { useRunStore } from "../state/runStore";
import { requestReward } from "../ai/rewardApi";
import cardCatalog from "../data/cardCatalog.json";
import { addRunHistory, ensureProgress, unlockCharacter } from "../save/progressStore";
import RewardReveal from "./RewardReveal";
import RunSummaryScreen from "./RunSummaryScreen";

const MS_PER_SECOND = 1000;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function RunOutcomeManager() {
  const world = useWorldStore((state) => state.world);
  const runPhase = useRunStore((state) => state.phase);
  const runStartTime = useRunStore((state) => state.runStartTime);
  const runEndTime = useRunStore((state) => state.runEndTime);
  const objectivesCompleted = useRunStore((state) => state.objectivesCompleted);
  const result = useRunStore((state) => state.result);
  const reward = useRunStore((state) => state.reward);
  const setReward = useRunStore((state) => state.setReward);

  const [summary, setSummary] = useState(null);

  const lockedCatalog = useMemo(() => {
    const progress = ensureProgress();
    const locked = cardCatalog.filter(
      (card) => card.category === "character" && !progress.unlockedCharacters.includes(card.id)
    );
    return locked.length ? locked : cardCatalog.filter((card) => card.category === "character");
  }, []);

  useEffect(() => {
    if (runPhase !== "complete" || !result || summary) {
      return;
    }

    const durationMs = runEndTime && runStartTime ? runEndTime - runStartTime : 0;
    const summaryPayload = {
      objectivesCompleted,
      corruption: world.corruption,
      danger: world.dangerLevel,
      durationLabel: formatDuration(durationMs),
      result
    };

    setSummary(summaryPayload);
    addRunHistory({
      ...summaryPayload,
      durationMs,
      timestamp: new Date().toISOString()
    });

    if (!reward) {
      requestReward(world, summaryPayload, lockedCatalog)
        .then((response) => {
          setReward(response);
          if (response?.cardId) {
            unlockCharacter(response.cardId);
          }
        })
        .catch(() => {
          setReward({ cardId: "CHAR_001", rarity: "common", reason: "Fallback reward" });
        });
    }
  }, [
    runPhase,
    result,
    summary,
    world,
    objectivesCompleted,
    runEndTime,
    runStartTime,
    reward,
    setReward,
    lockedCatalog
  ]);

  if (runPhase !== "complete") {
    return null;
  }

  return (
    <>
      <RunSummaryScreen summary={summary} />
      <RewardReveal reward={reward} />
    </>
  );
}
