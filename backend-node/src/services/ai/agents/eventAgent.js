import { loadSchema } from "../../../schemas/loadSchema.js";
import { requestJson } from "../openaiClient.js";
import { requireJson } from "../jsonGuard.js";

const outputSchema = loadSchema("ai/eventOutput.schema.json");

const systemPrompt =
  "You are the Event Generator Agent. " +
  "Return strict JSON with spawnEvent, location, and effects only.";

function asString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim());
}

function normalizeEventOutput(raw) {
  let source = raw || {};
  if (typeof raw === "string") {
    try {
      source = JSON.parse(raw);
    } catch {
      source = {};
    }
  }
  const nextEvent = source.nextEvent && typeof source.nextEvent === "object" ? source.nextEvent : {};
  const effects = source.effects && typeof source.effects === "object" ? source.effects : {};

  const spawnEvent = asString(
    source.spawnEvent || source.eventId || source.prefabId || nextEvent.spawnEvent || source.nextEventId,
    "ambient_shift"
  );

  const location = asString(
    source.location || nextEvent.location || source.targetLocation || source.area,
    "shoreline"
  );

  return {
    spawnEvent,
    location,
    effects: {
      visual: asStringArray(effects.visual),
      audio: asStringArray(effects.audio),
      particles: asStringArray(effects.particles)
    },
    ...(Array.isArray(source.dialogue) && source.dialogue.length
      ? { dialogue: asStringArray(source.dialogue) }
      : {})
  };
}

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

  try {
    return requireJson(outputSchema, raw);
  } catch (error) {
    const normalized = normalizeEventOutput(raw);
    return requireJson(outputSchema, normalized);
  }
}
