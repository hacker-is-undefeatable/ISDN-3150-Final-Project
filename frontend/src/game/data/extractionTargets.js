const EXTRACTION_TARGETS = [
  { id: "boat_escape", label: "Boat escape", position: { x: 58.2, y: 12.18, z: -89.5 } },
  { id: "flare_signal", label: "Flare signal", position: { x: 44.5, y: 23.04, z: 6.1 } },
  { id: "cave_exit", label: "Cave exit", position: { x: -3.3, y: 11.2, z: 7.9 } },
  { id: "bridge_crossing", label: "Bridge crossing", position: { x: 32.7, y: 23.04, z: 4.9 } }
];

function createSeededRandom(seed) {
  let state = Number.isFinite(seed) ? seed : Date.now();
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

export function pickExtractionTarget(seed) {
  const random = createSeededRandom(seed);
  const choice = EXTRACTION_TARGETS[Math.floor(random() * EXTRACTION_TARGETS.length)];
  return choice ? { ...choice } : null;
}
