import { useEffect, useMemo, useState } from "react";
import { requestNpcDialogue } from "../ai/npcApi";
import { shouldIgnoreGameplayKey } from "../lib/inputGuards";
import { vectorToBearingDeg, bearingToCardinal } from "../lib/bearing";
import { useWorldStore } from "../state/worldStore";
import { useRunStore } from "../state/runStore";
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
  const setExtractionTarget = useWorldStore((state) => state.setExtractionTarget);
  const patchWorld = useWorldStore((state) => state.patchWorld);
  const setExtractionAvailable = useRunStore((state) => state.setExtractionAvailable);

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
      if (shouldIgnoreGameplayKey(event)) return;
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
            timestamp: new Date().toISOString(),
            from: "npc"
          };
          updateNpcState(npcId, {
            emotion: response.emotion,
            suspicion: response.suspicion,
            tone: response.tone
          });
          appendDialogue(npcId, entry);
          setActiveNpc(npcId);
          // If the world is waiting for NPC guidance, assign extraction here (no coordinates revealed in dialogue)
          try {
            if (worldState.awaitingNpcGuidance && !worldState.extractionTarget && Array.isArray(worldState.extractionOptions) && worldState.extractionOptions.length) {
              const opts = worldState.extractionOptions;
              const seed = Number(worldState.runSeed) || Date.now();
              const pick = Math.abs(seed) % opts.length;
              const chosen = opts[pick];
              setExtractionTarget(chosen);
              setExtractionAvailable(true);
              // compute direction hint relative to playerCoords if available
              try {
                const player = playerHistory.length ? playerHistory[playerHistory.length - 1] : null;
                // playerCoords passed as prop might be up-to-date; use fallback to playerHistory last known coords
                const playerPos = playerCoords || (player && player.position) || { x: 0, y: 0, z: 0 };
                const deg = Math.round(vectorToBearingDeg(playerPos, chosen.position));
                const card = bearingToCardinal(deg);
                patchWorld({ awaitingNpcGuidance: false, extractionOptions: [], directionHint: { degrees: deg, cardinal: card, label: chosen.label } });
                appendDialogue(npcId, { text: `The guide points you toward the ${chosen.label}.`, timestamp: new Date().toISOString(), from: "npc" });
              } catch (inner) {
                patchWorld({ awaitingNpcGuidance: false, extractionOptions: [], directionHint: null });
                appendDialogue(npcId, { text: `The guide points you toward the ${chosen.label}.`, timestamp: new Date().toISOString(), from: "npc" });
              }
            }
          } catch (e) {
            // silent
          }
        })
        .catch(() => {
          appendDialogue(npcId, {
            text: "The NPC does not respond.",
            timestamp: new Date().toISOString(),
            from: "npc"
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

  const handleSend = async (text) => {
    const playerEntry = { text, timestamp: new Date().toISOString(), from: "player" };
    appendDialogue(npcId, playerEntry);
    appendHistory?.({ type: "npc_question", npcId, text, timestamp: new Date().toISOString() });

    const payloadHistory = playerHistory.slice(-6).concat({ text, timestamp: new Date().toISOString(), from: "player" });
    const factionTrust = Object.entries(worldState.factions || {}).reduce(
      (acc, [key, value]) => ({ ...acc, [key]: value?.trust ?? 0 }),
      {}
    );

    try {
      const response = await requestNpcDialogue(worldState, npcId, payloadHistory, [], factionTrust);
      const entry = { text: response.dialogue || "...", timestamp: new Date().toISOString(), from: "npc" };
      updateNpcState(npcId, { emotion: response.emotion, suspicion: response.suspicion, tone: response.tone });
      appendDialogue(npcId, entry);
      setActiveNpc(npcId);

      try {
        if (worldState.awaitingNpcGuidance && !worldState.extractionTarget && Array.isArray(worldState.extractionOptions) && worldState.extractionOptions.length) {
          const opts = worldState.extractionOptions;
          const seed = Number(worldState.runSeed) || Date.now();
          const pick = Math.abs(seed + (text.length || 0)) % opts.length;
          const chosen = opts[pick];
          setExtractionTarget(chosen);
          setExtractionAvailable(true);
          try {
            const playerPos = playerCoords || (playerHistory.length ? playerHistory[playerHistory.length - 1] : null) || { x: 0, y: 0, z: 0 };
            const deg = Math.round(vectorToBearingDeg(playerPos, chosen.position));
            const card = bearingToCardinal(deg);
            patchWorld({ awaitingNpcGuidance: false, extractionOptions: [], directionHint: { degrees: deg, cardinal: card, label: chosen.label } });
            appendDialogue(npcId, { text: `The guide points you toward the ${chosen.label}.`, timestamp: new Date().toISOString(), from: "npc" });
          } catch (e) {
            patchWorld({ awaitingNpcGuidance: false, extractionOptions: [], directionHint: null });
            appendDialogue(npcId, { text: `The guide points you toward the ${chosen.label}.`, timestamp: new Date().toISOString(), from: "npc" });
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      appendDialogue(npcId, { text: "The NPC does not respond.", timestamp: new Date().toISOString(), from: "npc" });
    }
  };

  return (
    <>
      {promptVisible && <div className="interaction-prompt">Press E to talk</div>}
      <DialoguePanel npcId={npcId} onSend={handleSend} />
    </>
  );
}
