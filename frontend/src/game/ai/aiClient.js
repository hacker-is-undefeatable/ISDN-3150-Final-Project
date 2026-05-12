const BASE_URL =
  import.meta.env.VITE_AI_API_URL || "http://localhost:5050";

async function postJson(path, payload) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  return response.json();
}

export const aiClient = {
  director: (payload) => postJson("/api/ai/director", payload),
  npc: (payload) => postJson("/api/ai/npc", payload),
  event: (payload) => postJson("/api/ai/event", payload),
  reward: (payload) => postJson("/api/ai/reward", payload),
  interaction: (payload) => postJson("/api/ai/interaction", payload)
};
