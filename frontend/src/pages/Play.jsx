import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GameScene from "../components/GameScene";
import { getCharacterModelPath, ALLOWED_CHARACTER_MODELS } from "../lib/avatarModels";
import { useWorldStore } from "../game/state/worldStore";
import { getLocationKeys, pickLocationTarget } from "../game/data/locationTargets";

export default function Play() {
  const location = useLocation();
  const navigate = useNavigate();
  const [objectivesReady, setObjectivesReady] = useState(false);
  const hasPreloadedRef = useRef(false);
  const objectiveTargets = useWorldStore((state) => state.world.objectiveTargets || []);
  const setObjectiveTargets = useWorldStore((state) => state.setObjectiveTargets);
  const patchWorld = useWorldStore((state) => state.patchWorld);
  const runSeed = useWorldStore((state) => state.world.runSeed || 0);

  const scene = location.state?.scene || "dungeon";
  const selectedCharacter = location.state?.character || null;

  const modelCode =
    typeof selectedCharacter === "string" &&
    ALLOWED_CHARACTER_MODELS.some((entry) => entry.code === selectedCharacter)
      ? selectedCharacter
      : (() => {
          const legacyIndex =
            typeof selectedCharacter === "string"
              ? Number.parseInt(selectedCharacter.split("_")[1], 10)
              : Number.NaN;

          if (!Number.isNaN(legacyIndex)) {
            return ALLOWED_CHARACTER_MODELS[
              Math.max(0, Math.min(legacyIndex, ALLOWED_CHARACTER_MODELS.length - 1))
            ].code;
          }

          return ALLOWED_CHARACTER_MODELS[0].code;
        })();

  const avatarModelPath = getCharacterModelPath(modelCode);
  const preloadCount = 5;

  useEffect(() => {
    if (hasPreloadedRef.current) {
      setObjectivesReady(true);
      return;
    }

    if (objectiveTargets.length >= preloadCount) {
      patchWorld({ objectivesPreloaded: true });
      hasPreloadedRef.current = true;
      setObjectivesReady(true);
      return;
    }

    const locationKeys = getLocationKeys();
    const seen = new Set();
    const nextTargets = [];
    let safety = 0;

    while (nextTargets.length < preloadCount && safety < 200) {
      const key = locationKeys[nextTargets.length % locationKeys.length];
      const target = pickLocationTarget(key, runSeed + nextTargets.length);
      if (target?.position) {
        const sig = `${target.location}:${target.position.x},${target.position.y},${target.position.z}`;
        if (!seen.has(sig)) {
          seen.add(sig);
          nextTargets.push({
            id: `obj_${Date.now()}_${nextTargets.length}`,
            ...target
          });
        }
      }
      safety += 1;
    }

    if (nextTargets.length) {
      setObjectiveTargets(nextTargets);
    }

    patchWorld({ objectivesPreloaded: true });
    hasPreloadedRef.current = true;
    setObjectivesReady(true);
  }, [objectiveTargets.length, patchWorld, setObjectiveTargets]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="game-topbar">
        <button className="back-to-lobby-btn" onClick={() => navigate(-1)}>
          ← Back to Lobby
        </button>
      </div>
      {objectivesReady ? (
        <GameScene avatarModelPath={avatarModelPath} />
      ) : (
        <div className="p-4">Loading objectives...</div>
      )}
    </div>
  );
}
