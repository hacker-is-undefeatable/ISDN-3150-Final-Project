const EXTRACTION_TARGETS = [
  { id: "boat_escape", label: "Boat escape", position: { x: 58.2, y: 12.18, z: -89.5 } },
  { id: "flare_signal", label: "Flare signal", position: { x: 44.5, y: 23.04, z: 6.1 } },
  { id: "cave_exit", label: "Cave exit", position: { x: -3.3, y: 11.2, z: 7.9 } },
  { id: "bridge_crossing", label: "Bridge crossing", position: { x: 32.7, y: 23.04, z: 4.9 } }
];

export function pickExtractionTarget() {
  const choice = EXTRACTION_TARGETS[Math.floor(Math.random() * EXTRACTION_TARGETS.length)];
  return choice ? { ...choice } : null;
}
