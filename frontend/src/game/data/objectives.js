export const OBJECTIVE_TYPES = [
  {
    id: "investigate_anomaly",
    label: "Investigate anomaly",
    requiresInteraction: true,
    radius: 4.5,
    dangerDelta: 1,
    corruptionDelta: 2
  },
  {
    id: "recover_relic",
    label: "Recover relic",
    requiresInteraction: true,
    radius: 3.5,
    dangerDelta: 0,
    corruptionDelta: -1
  },
  {
    id: "survive_event",
    label: "Survive event",
    requiresInteraction: false,
    radius: 5.5,
    timerSeconds: 12,
    dangerDelta: 2,
    corruptionDelta: 3
  },
  {
    id: "talk_to_npc",
    label: "Talk to NPC",
    requiresInteraction: true,
    radius: 3.0,
    dangerDelta: -1,
    corruptionDelta: -2
  },
  {
    id: "activate_ritual",
    label: "Activate ritual",
    requiresInteraction: true,
    radius: 4.0,
    dangerDelta: 1,
    corruptionDelta: 4
  },
  {
    id: "escape_corrupted_area",
    label: "Escape corrupted area",
    requiresInteraction: false,
    radius: 6.0,
    timerSeconds: 8,
    dangerDelta: -1,
    corruptionDelta: -3
  },
  {
    id: "inspect_abandoned_camp",
    label: "Inspect abandoned camp",
    requiresInteraction: true,
    radius: 3.5,
    dangerDelta: 0,
    corruptionDelta: 1
  },
  {
    id: "witness_supernatural_event",
    label: "Witness supernatural event",
    requiresInteraction: false,
    radius: 5.0,
    timerSeconds: 10,
    dangerDelta: 1,
    corruptionDelta: 2
  }
];

export function pickObjectiveType(seed) {
  if (!OBJECTIVE_TYPES.length) return null;
  const index = seed
    ? Math.abs(seed) % OBJECTIVE_TYPES.length
    : Math.floor(Math.random() * OBJECTIVE_TYPES.length);
  return OBJECTIVE_TYPES[index];
}
