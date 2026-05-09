import { loadSchema } from "../../../schemas/loadSchema.js";
import { requestJson } from "../openaiClient.js";
import { parseJsonStrict, validateJson } from "../jsonGuard.js";

const outputSchema = loadSchema("ai/directorOutput.schema.json");

const systemPrompt =
  "You are the Director Agent for a replayable island exploration game. " +
  "Return ONLY a JSON object with keys: nextEvent, weather, pacing, adjustments. " +
  "nextEvent must have spawnEvent and location. pacing must have intensity and delaySeconds. " +
  "adjustments must have dangerDelta and corruptionDelta. " +
  "Prefer locations and events NOT present in recentEvents, if possible. " +
  "Do NOT include any other keys or extra text.";

export async function runDirectorAgent(payload) {
  const user = JSON.stringify(
    {
      worldState: payload.worldState,
      playerActions: payload.playerActions || [],
      recentEvents: payload.recentEvents || []
    },
    null,
    2
  );

  const raw = await requestJson({
    system: systemPrompt,
    user,
    schema: outputSchema,
    schemaName: "director_output"
  });

  console.info("[Director][Raw]", raw);

  const json = parseJsonStrict(raw);
  if (json?.pacing) {
    const intensity = Number(json.pacing.intensity);
    const delaySeconds = Number(json.pacing.delaySeconds);
    json.pacing.intensity = Number.isFinite(intensity)
      ? Math.max(0, Math.min(1, intensity))
      : 0.5;
    json.pacing.delaySeconds = Number.isFinite(delaySeconds)
      ? Math.max(10, Math.min(600, Math.round(delaySeconds)))
      : 60;
  }

  if (json?.adjustments) {
    const dangerDelta = Number(json.adjustments.dangerDelta);
    const corruptionDelta = Number(json.adjustments.corruptionDelta);
    if (Number.isFinite(dangerDelta)) {
      json.adjustments.dangerDelta = Math.max(-3, Math.min(3, dangerDelta));
    }
    if (Number.isFinite(corruptionDelta)) {
      json.adjustments.corruptionDelta = Math.max(-10, Math.min(10, corruptionDelta));
    }
  }

  return validateJson(outputSchema, json);
}
