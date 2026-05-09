import { loadSchema } from "../../../schemas/loadSchema.js";
import { requestJson } from "../openaiClient.js";
import { requireJson } from "../jsonGuard.js";

const outputSchema = loadSchema("ai/rewardOutput.schema.json");

const systemPrompt =
  "You are the Reward Agent. " +
  "Decide collectible card rewards and unlock conditions. Output strict JSON only.";

export async function runRewardAgent(payload) {
  const user = JSON.stringify(
    {
      worldState: payload.worldState,
      runSummary: payload.runSummary,
      cardCatalog: payload.cardCatalog || []
    },
    null,
    2
  );

  const raw = await requestJson({
    system: systemPrompt,
    user,
    schema: outputSchema,
    schemaName: "reward_output"
  });

  return requireJson(outputSchema, raw);
}
