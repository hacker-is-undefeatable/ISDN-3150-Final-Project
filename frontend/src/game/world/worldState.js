export const initialWorldState = {
  runSeed: 0,
  timeOfDay: "night",
  weather: "clear",
  dangerLevel: 0,
  corruption: 0,
  activeEvents: [],
  objectiveTargets: [],
  objectivesPreloaded: false,
  extractionTarget: null,
  player: {
    location: "port",
    health: 100,
    inventory: []
  },
  factions: {
    villagers: { trust: 50, aggression: 10 },
    spirits: { trust: 10, aggression: 60 }
  }
};

function mergeFactions(base, patch) {
  if (!patch) {
    return base;
  }
  const next = { ...base };
  Object.keys(patch).forEach((key) => {
    next[key] = { ...base[key], ...patch[key] };
  });
  return next;
}

export function mergeWorldState(base, patch) {
  return {
    ...base,
    ...patch,
    player: { ...base.player, ...patch.player },
    factions: mergeFactions(base.factions, patch.factions)
  };
}
