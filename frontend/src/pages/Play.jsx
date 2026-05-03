import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GameScene from "../components/GameScene";
import { getCharacterModelPath, ALLOWED_CHARACTER_MODELS } from "../lib/avatarModels";

export default function Play() {
  const location = useLocation();
  const navigate = useNavigate();

  const scene = location.state?.scene || "dungeon";
  const characterId = location.state?.character || null;

  // simple mapping: char_00 -> pick model at index 0, clamp to available models
  let modelIndex = 0;
  if (characterId && typeof characterId === "string") {
    const parsed = parseInt(characterId.split("_")[1], 10);
    if (!Number.isNaN(parsed)) modelIndex = Math.max(0, Math.min(parsed, ALLOWED_CHARACTER_MODELS.length - 1));
  }

  const modelCode = ALLOWED_CHARACTER_MODELS[modelIndex].code;
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
