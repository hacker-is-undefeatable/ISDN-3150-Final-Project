import { aiClient } from "./aiClient";

export async function requestInteractionDecision(payload) {
  return aiClient.interaction(payload);
}
