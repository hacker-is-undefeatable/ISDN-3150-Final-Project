import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GameScene from "../components/GameScene";
import { getCharacterModelPath, ALLOWED_CHARACTER_MODELS } from "../lib/avatarModels";

export default function Play() {
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-4">
        <button className="px-3 py-1 bg-gray-800 rounded" onClick={() => navigate(-1)}>
          Back to Lobby
        </button>
      </div>
      <GameScene avatarModelPath={avatarModelPath} />
    </div>
  );
}
