import { loadSchema } from "../../../schemas/loadSchema.js";
import { requestJson } from "../openaiClient.js";
import { requireJson } from "../jsonGuard.js";

const outputSchema = loadSchema("ai/eventOutput.schema.json");

const systemPrompt =
  "You are the Event Generator Agent. " +
  "Select a prefab id and return trigger metadata as strict JSON.";

export async function runEventAgent(payload) {
  const user = JSON.stringify(
    {
      worldState: payload.worldState,
      recentEvents: payload.recentEvents || [],
      availablePrefabs: payload.availablePrefabs || []
    },
    null,
    2
  );

  const raw = await requestJson({
    system: systemPrompt,
    user,
    schema: outputSchema,
    schemaName: "event_output"
  });

  return requireJson(outputSchema, raw);
}
