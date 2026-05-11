const CAVE_POSITIONS = [
  { x: -1.12, y: 11.28, z: 6.9 },
  { x: 0.4, y: 11.48, z: 12.12 },
  { x: 0.02, y: 11.67, z: 10.09 },
  { x: -4.6, y: 11.2, z: 7.92 },
  { x: -3.38, y: 11.01, z: 12.11 }
];

const RUINS_POSITIONS = [
  { x: -34.4, y: 24.02, z: 22.22 },
  { x: -34.36, y: 24.02, z: 11.92 },
  { x: -21.69, y: 24.02, z: 25.01 },
  { x: -22.55, y: 24.02, z: 18.49 },
  { x: -14.24, y: 24.02, z: 27.06 },
  { x: -26.37, y: 24.05, z: 12.82 }
];

const PORT_POSITIONS = [
  { x: 57.3, y: 12.18, z: -77.7 },
  { x: 60.25, y: 12.18, z: -81.47 },
  { x: 63.73, y: 12.18, z: -84.99 },
  { x: 62.86, y: 12.18, z: -90.0 },
  { x: 62.5, y: 12.18, z: -95.33 },
  { x: 57.19, y: 12.18, z: -93.83 }
];

const BRIDGE_POSITIONS = [
  { x: 32.66, y: 23.04, z: 4.98 },
  { x: 35.2, y: 23.04, z: 6.48 },
  { x: 39.4, y: 23.04, z: 7.17 },
  { x: 44.49, y: 23.04, z: 5.69 },
  { x: 51.47, y: 23.04, z: 6.69 },
  { x: 60.46, y: 23.04, z: 6.96 }
];

const SHORELINE_POSITIONS = [
  { x: 72.38, y: 9.98, z: -48.43 },
  { x: 69.06, y: 10.12, z: -43.28 },
  { x: 66.25, y: 10.26, z: -37.63 },
  { x: 60.36, y: 9.97, z: -27.99 },
  { x: 53.46, y: 9.93, z: -19.84 }
];

const FOREST_PATH_POSITIONS = [
  { x: -22.65, y: 24.04, z: -5.54 },
  { x: -25.7, y: 25.97, z: -20.15 },
  { x: -35.7, y: 26.02, z: -18.83 },
  { x: 13.15, y: 24.02, z: 12.05 },
  { x: 12.72, y: 26.61, z: 29.07 },
  { x: -5.06, y: 26.02, z: 32.96 },
  { x: -39.63, y: 28.02, z: -22.16 },
  { x: -33.77, y: 28.02, z: -33.43 },
  { x: -24.74, y: 30.02, z: -30.86 }
];

const LOCATION_POOLS = {
  cave: CAVE_POSITIONS,
  ruins: RUINS_POSITIONS,
  port: PORT_POSITIONS,
  bridge: BRIDGE_POSITIONS,
  shoreline: SHORELINE_POSITIONS,
  forest_path: FOREST_PATH_POSITIONS
};

const STORY_OBJECTIVE_TYPES = ["repair_lantern", "light_candles", "recover_relics"];
const SCATTER_LOCATIONS = ["ruins", "port", "bridge", "shoreline", "forest_path", "cave"];

function createSeededRandom(seed) {
  let state = Number.isFinite(seed) ? seed : Date.now();
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function formatLocationLabel(locationKey) {
  return String(locationKey || "").replace(/_/g, " ");
}

function pickFromPool(pool, seed, count) {
  if (!Array.isArray(pool) || !pool.length || count <= 0) {
    return [];
  }

  const random = createSeededRandom(seed);
  const startIndex = Math.floor(random() * pool.length);
  const nextPositions = [];

  for (let offset = 0; offset < pool.length && nextPositions.length < count; offset += 1) {
    const candidate = pool[(startIndex + offset) % pool.length];
    const exists = nextPositions.some(
      (entry) => entry.x === candidate.x && entry.y === candidate.y && entry.z === candidate.z
    );

    if (!exists) {
      nextPositions.push(candidate);
    }
  }

  return nextPositions.slice(0, count);
}

function pickScatterLocation(seed, salt = 0) {
  const random = createSeededRandom(seed + salt);
  return SCATTER_LOCATIONS[Math.floor(random() * SCATTER_LOCATIONS.length)];
}

export function buildStoryObjective(runSeed = 0) {
  const seed = Number.isFinite(runSeed) ? runSeed : 0;
  const type = STORY_OBJECTIVE_TYPES[Math.abs(seed) % STORY_OBJECTIVE_TYPES.length];

  if (type === "repair_lantern") {
    // pick a random location from all defined pools so lantern can appear anywhere
    const allKeys = Object.keys(LOCATION_POOLS || {});
    const rand = createSeededRandom(seed + 11);
    const locationKey = allKeys[Math.floor(rand() * allKeys.length)];
    const positions = pickFromPool(LOCATION_POOLS[locationKey], seed + 11, 1).map(p => [p.x, p.y, p.z]);

    return {
      id: `story_${type}_${Math.abs(seed)}`,
      type,
      locationKey,
      locationLabel: formatLocationLabel(locationKey),
      title: "Repair the lantern",
      hint: `The broken lantern is waiting in the ${formatLocationLabel(locationKey)}.`,
      positions
    };
  }

  const locationKey = pickScatterLocation(seed, type === "light_candles" ? 19 : 31);
  const label = formatLocationLabel(locationKey);

  // For recover_relics, scatter the relics across random pools (could be same pool multiple times)
  const positions = (function () {
    if (type !== "recover_relics") {
      const locationKey = pickScatterLocation(seed, type === "light_candles" ? 19 : 31);
      return pickFromPool(LOCATION_POOLS[locationKey], seed + 7, 4).map(p => [p.x, p.y, p.z]);
    }

    const out = [];
    for (let i = 0; i < 4; i += 1) {
      const locKey = pickScatterLocation(seed, 100 + i);
      const picked = pickFromPool(LOCATION_POOLS[locKey], seed + 200 + i, 1)[0];
      if (picked) out.push([picked.x, picked.y, picked.z]);
      else {
        // fallback to a generic ruins position to avoid empty slot
        const fallback = LOCATION_POOLS.ruins[0] || { x: 0, y: 0, z: 0 };
        out.push([fallback.x, fallback.y, fallback.z]);
      }
    }

    return out;
  })();

  if (type === "light_candles") {
    return {
      id: `story_${type}_${Math.abs(seed)}`,
      type,
      locationKey,
      locationLabel: label,
      title: "Light the candles",
      hint: `The candles are scattered through the ${label}.`,
      positions
    };
  }
  // For relic recovery objective we scatter fragments across multiple pools,
  // so use a generic label to reflect that they may be in various locations.
  if (type === "recover_relics") {
    return {
      id: `story_${type}_${Math.abs(seed)}`,
      type,
      locationKey: "scattered",
      locationLabel: "various locations",
      title: "Recover the relics",
      hint: "The relics are hidden across multiple locations.",
      positions
    };
  }

  return {
    id: `story_${type}_${Math.abs(seed)}`,
    type,
    locationKey,
    locationLabel: label,
    title: "Recover the relics",
    hint: `The relics are hidden in the ${label}.`,
    positions
  };
}
