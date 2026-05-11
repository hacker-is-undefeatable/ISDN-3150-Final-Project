import { loadSchema } from "../../../schemas/loadSchema.js";
import { requestJson } from "../openaiClient.js";
import { requireJson } from "../jsonGuard.js";

const outputSchema = loadSchema("ai/npcOutput.schema.json");

const systemPrompt =
  "You are the NPC Agent for the island. " +
  "If worldState.storyObjective exists, use it to guide the player toward the correct region in a natural, in-world way. " +
  "Never reveal exact coordinates, numbers, map markers, or hidden spawn positions. " +
  "Keep the response concise and avoid overexplaining. " +
  "Return ONLY a JSON object with keys: npcId, dialogue, suspicion, emotion, tone. " +
  "Do NOT include any other keys or extra text.";

export async function runNpcAgent(payload) {
  const user = JSON.stringify(
    {
      worldState: payload.worldState,
      npcId: payload.npcId,
      playerHistory: payload.playerHistory || [],
      recentEvents: payload.recentEvents || [],
      factionTrust: payload.factionTrust || {}
    },
    null,
    2
  );

  const raw = await requestJson({
    system: systemPrompt,
    user,
    schema: outputSchema,
    schemaName: "npc_output"
  });

  return requireJson(outputSchema, raw);
}
