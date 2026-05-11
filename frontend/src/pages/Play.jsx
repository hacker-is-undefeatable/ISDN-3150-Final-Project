import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GameScene from "../components/GameScene";
import { getCharacterModelPath, ALLOWED_CHARACTER_MODELS } from "../lib/avatarModels";
import { useWorldStore } from "../game/state/worldStore";

export default function Play() {
  const location = useLocation();
  const navigate = useNavigate();
  const [objectivesReady, setObjectivesReady] = useState(false);
  const hasPreloadedRef = useRef(false);
  const patchWorld = useWorldStore((state) => state.patchWorld);

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

  useEffect(() => {
    if (hasPreloadedRef.current) {
      setObjectivesReady(true);
      return;
    }

    patchWorld({ objectivesPreloaded: true, objectiveTargets: [] });
    hasPreloadedRef.current = true;
    setObjectivesReady(true);
  }, [patchWorld]);

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
