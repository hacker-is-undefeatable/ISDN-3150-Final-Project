import { aiClient } from "./aiClient";

export async function requestNpcDialogue(
  worldState,
  npcId,
  playerHistory,
  recentEvents,
  factionTrust
) {
  return aiClient.npc({
    worldState,
    npcId,
    playerHistory,
    recentEvents,
    factionTrust
  });
}
