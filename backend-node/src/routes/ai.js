import { Router } from "express";
import { runDirectorAgent } from "../services/ai/agents/directorAgent.js";
import { runNpcAgent } from "../services/ai/agents/npcAgent.js";
import { runEventAgent } from "../services/ai/agents/eventAgent.js";
import { runRewardAgent } from "../services/ai/agents/rewardAgent.js";

const router = Router();

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

export default router;
