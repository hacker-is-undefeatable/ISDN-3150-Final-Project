import { aiClient } from "./aiClient";

export async function requestReward(worldState, runSummary, cardCatalog) {
  return aiClient.reward({ worldState, runSummary, cardCatalog });
}
