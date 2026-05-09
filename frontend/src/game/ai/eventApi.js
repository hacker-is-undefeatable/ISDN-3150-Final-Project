import { aiClient } from "./aiClient";

export async function requestDynamicEvent(worldState, recentEvents, availablePrefabs) {
  return aiClient.event({ worldState, recentEvents, availablePrefabs });
}
