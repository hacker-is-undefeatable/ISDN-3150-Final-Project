import { useEffect, useMemo, useState } from "react";
import { requestNpcDialogue } from "../ai/npcApi";
import { useWorldStore } from "../state/worldStore";
import { usePlayerStore } from "../state/playerStore";
import { useNpcStore } from "../state/npcStore";
import DialoguePanel from "./DialoguePanel";

const INTERACTION_RADIUS = 3.0;
const COOLDOWN_MS = 5000;

export default function NPCInteractionManager({ npcId, npcPosition, playerCoords }) {
  const worldState = useWorldStore((state) => state.world);
  const playerHistory = usePlayerStore((state) => state.history || []);
  const appendHistory = usePlayerStore((state) => state.appendHistory);

  const setActiveNpc = useNpcStore((state) => state.setActiveNpc);
  const appendDialogue = useNpcStore((state) => state.appendDialogue);
  const updateNpcState = useNpcStore((state) => state.updateNpcState);
  const canInteract = useNpcStore((state) => state.canInteract);
  const setCooldown = useNpcStore((state) => state.setCooldown);

  const [promptVisible, setPromptVisible] = useState(false);

  const distance = useMemo(() => {
    if (!npcPosition || !playerCoords) return Number.POSITIVE_INFINITY;
    const dx = npcPosition.x - playerCoords.x;
    const dy = npcPosition.y - playerCoords.y;
    const dz = npcPosition.z - playerCoords.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [npcPosition, playerCoords]);

  useEffect(() => {
    setPromptVisible(distance <= INTERACTION_RADIUS);
  }, [distance]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "e") return;
      if (!promptVisible) return;
      if (!canInteract()) return;

      event.preventDefault();
      setCooldown(COOLDOWN_MS);

      const factionTrust = Object.entries(worldState.factions || {}).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value?.trust ?? 0
        }),
        {}
      );

      const payloadHistory = playerHistory.slice(-6);
      appendHistory?.({
        type: "npc_interaction",
        npcId,
        timestamp: new Date().toISOString()
      });

      requestNpcDialogue(worldState, npcId, payloadHistory, [], factionTrust)
        .then((response) => {
          const entry = {
            text: response.dialogue || "...",
            timestamp: new Date().toISOString()
          };
          updateNpcState(npcId, {
            emotion: response.emotion,
            suspicion: response.suspicion,
            tone: response.tone
          });
          appendDialogue(npcId, entry);
          setActiveNpc(npcId);
        })
        .catch(() => {
          appendDialogue(npcId, {
            text: "The NPC does not respond.",
            timestamp: new Date().toISOString()
          });
          setActiveNpc(npcId);
        });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    npcId,
    promptVisible,
    canInteract,
    setCooldown,
    worldState,
    playerHistory,
    appendHistory,
    updateNpcState,
    appendDialogue,
    setActiveNpc
  ]);

  return (
    <>
      {promptVisible && <div className="interaction-prompt">Press E to talk</div>}
      <DialoguePanel npcId={npcId} />
    </>
  );
}
