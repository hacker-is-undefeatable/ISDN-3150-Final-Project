import { aiClient } from "./aiClient";

export async function requestDirectorUpdate(worldState, playerActions, recentEvents) {
  return aiClient.director({ worldState, playerActions, recentEvents });
}
