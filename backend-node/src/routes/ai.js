import { Router } from "express";
import { runDirectorAgent } from "../services/ai/agents/directorAgent.js";
import { runNpcAgent } from "../services/ai/agents/npcAgent.js";
import { runEventAgent } from "../services/ai/agents/eventAgent.js";
import { runRewardAgent } from "../services/ai/agents/rewardAgent.js";

const router = Router();
const CANDLE_SEQUENCE = [0, 2, 3, 1];

function resolveWeatherForTension(tension = 0) {
  if (tension >= 2) return "night";
  if (tension >= 1) return "mist";
  return "cloudy";
}

function validateCandleState(state) {
  const sequence = Array.isArray(state?.sequence) ? state.sequence : [];
  if (!sequence.length) return "progress";

  const isPrefix = sequence.every((value, index) => value === CANDLE_SEQUENCE[index]);
  if (!isPrefix) return "fail";
  if (sequence.length === CANDLE_SEQUENCE.length) return "success";
  return "progress";
}

router.post("/director", async (req, res) => {
  try {
    const result = await runDirectorAgent(req.body);
    res.json(result);
  } catch (error) {
    console.error("[AI][Director]", error);
    res.status(500).json({ error: "DIRECTOR_AGENT_FAILED", details: error.message });
  }
});

router.post("/npc", async (req, res) => {
  try {
    const result = await runNpcAgent(req.body);
    res.json(result);
  } catch (error) {
    console.error("[AI][NPC]", error);
    res.status(500).json({ error: "NPC_AGENT_FAILED", details: error.message });
  }
});

router.post("/event", async (req, res) => {
  try {
    const result = await runEventAgent(req.body);
    res.json(result);
  } catch (error) {
    console.error("[AI][Event]", error);
    res.status(500).json({ error: "EVENT_AGENT_FAILED", details: error.message });
  }
});

router.post("/reward", async (req, res) => {
  try {
    const result = await runRewardAgent(req.body);
    res.json(result);
  } catch (error) {
    console.error("[AI][Reward]", error);
    res.status(500).json({ error: "REWARD_AGENT_FAILED", details: error.message });
  }
});

router.post("/interaction", async (req, res) => {
  try {
    const { type, action, state, worldState } = req.body || {};
    const currentCorruption = Number(worldState?.corruption) || 0;
    const currentDanger = Number(worldState?.dangerLevel) || 0;

    if (type === "candle_ritual") {
      const result = validateCandleState(state);
      if (result === "fail") {
        return res.json({
          result,
          corruptionDelta: 8,
          supernaturalDelta: 2,
          weather: "night",
          atmosphere: {
            pulse: 1,
            ritualDelta: 0.5,
            audioRitualBoost: true,
            particleBurst: true
          },
          objectiveText: "The sequence failed. Rebuild the ritual from the first candle.",
          nextEvent: "whispers_intensify",
          location: "ruins"
        });
      }

      if (result === "success") {
        return res.json({
          result,
          corruptionDelta: -6,
          supernaturalDelta: 1,
          weather: "mist",
          atmosphere: {
            pulse: 0.65,
            ritualDelta: 0.4,
            audioRitualBoost: true,
            particleBurst: true
          },
          objectiveText: "Ritual stabilized. Recover relic fragments at the Forest Path.",
          nextEvent: "ritual_circle_activated",
          location: "ruins"
        });
      }

      return res.json({
        result,
        corruptionDelta: -1,
        supernaturalDelta: 1,
        weather: "mist",
        atmosphere: {
          pulse: 0.25,
          ritualDelta: 0.2,
          audioRitualBoost: true,
          particleBurst: true
        },
        objectiveText: "Keep the sequence steady. The ritual ring is responding.",
        nextEvent: "ritual_progress",
        location: "ruins"
      });
    }

    if (type === "lantern_repair") {
      return res.json({
        result: "success",
        corruptionDelta: -4,
        supernaturalDelta: 1,
        weather: "cloudy",
        atmosphere: { pulse: 0.35, ritualDelta: -0.2, particleBurst: true },
        objectiveText: "Lantern restored. The cave tablet now emits a clue.",
        nextEvent: "hidden_tablet_revealed",
        location: "cave"
      });
    }

    if (type === "tablet_inspection") {
      return res.json({
        result: "success",
        corruptionDelta: -2,
        supernaturalDelta: 1,
        weather: "mist",
        atmosphere: { pulse: 0.45, ritualDelta: 0.1, particleBurst: true },
        objectiveText: "Bridge resonance confirmed. Pull the sword from the stone.",
        nextEvent: "sword_calling",
        location: "bridge"
      });
    }

    if (type === "totem_cleansing") {
      return res.json({
        result: "success",
        corruptionDelta: -3,
        supernaturalDelta: -1,
        weather: "cloudy",
        atmosphere: { pulse: 0.25, ritualDelta: -0.1, particleBurst: true },
        objectiveText: "Forest corruption reduced. Continue the expedition.",
        nextEvent: "forest_cleansed",
        location: "forest_path"
      });
    }

    if (type === "port_cache") {
      return res.json({
        result: "success",
        corruptionDelta: -1,
        supernaturalDelta: 0,
        weather: resolveWeatherForTension(currentDanger / 2),
        atmosphere: { pulse: 0.2, ritualDelta: 0, particleBurst: true },
        objectiveText: "Cache opened. Extraction supplies secured.",
        nextEvent: "port_supply_cache_opened",
        location: "port"
      });
    }

    if (type === "sword_event" || action === "pull_sword") {
      return res.json({
        result: "success",
        corruptionDelta: Math.max(3, Math.ceil(currentCorruption * 0.12)),
        supernaturalDelta: 3,
        weather: "night",
        atmosphere: {
          pulse: 1.2,
          ritualDelta: 0.5,
          audioRitualBoost: true,
          particleBurst: true
        },
        objectiveText: "Sword removed. Reach Port immediately for extraction.",
        nextEvent: "island_escalation",
        location: "bridge",
        extractionUnlocked: true
      });
    }

    return res.json({
      result: "neutral",
      corruptionDelta: 0,
      supernaturalDelta: 0,
      weather: resolveWeatherForTension(currentDanger / 2),
      atmosphere: { pulse: 0, ritualDelta: 0, particleBurst: false },
      objectiveText: "Explore the island and interact with marked objects.",
      nextEvent: "ambient_shift",
      location: "shoreline"
    });
  } catch (error) {
    console.error("[AI][Interaction]", error);
    res.status(500).json({ error: "INTERACTION_AGENT_FAILED", details: error.message });
  }
});

export default router;
