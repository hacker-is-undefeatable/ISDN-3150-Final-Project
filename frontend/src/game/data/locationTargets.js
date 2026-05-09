const LOCATION_TARGETS = {
  cave: [
    { x: -1.12, y: 11.28, z: 6.9 },
    { x: 0.4, y: 11.48, z: 12.12 },
    { x: 0.02, y: 11.67, z: 10.09 },
    { x: -4.6, y: 11.2, z: 7.92 },
    { x: -3.38, y: 11.01, z: 12.11 }
  ],
  ruins: [
    { x: -34.4, y: 24.02, z: 22.22 },
    { x: -34.36, y: 24.02, z: 11.92 },
    { x: -21.69, y: 24.02, z: 25.01 },
    { x: -22.55, y: 24.02, z: 18.49 },
    { x: -14.24, y: 24.02, z: 27.06 },
    { x: -26.37, y: 24.05, z: 12.82 }
  ],
  port: [
    { x: 57.3, y: 12.18, z: -77.7 },
    { x: 60.25, y: 12.18, z: -81.47 },
    { x: 63.73, y: 12.18, z: -84.99 },
    { x: 62.86, y: 12.18, z: -90.0 },
    { x: 62.5, y: 12.18, z: -95.33 },
    { x: 57.19, y: 12.18, z: -93.83 }
  ],
  bridge: [
    { x: 32.66, y: 23.04, z: 4.98 },
    { x: 35.2, y: 23.04, z: 6.48 },
    { x: 39.4, y: 23.04, z: 7.17 },
    { x: 44.49, y: 23.04, z: 5.69 },
    { x: 51.47, y: 23.04, z: 6.69 },
    { x: 60.46, y: 23.04, z: 6.96 }
  ],
  shoreline: [
    { x: 72.38, y: 9.98, z: -48.43 },
    { x: 69.06, y: 10.12, z: -43.28 },
    { x: 66.25, y: 10.26, z: -37.63 },
    { x: 60.36, y: 9.97, z: -27.99 },
    { x: 53.46, y: 9.93, z: -19.84 }
  ],
  forest_paths: [
    { x: -22.65, y: 24.04, z: -5.54 },
    { x: -25.7, y: 25.97, z: -20.15 },
    { x: -35.7, y: 26.02, z: -18.83 },
    { x: 13.15, y: 24.02, z: 12.05 },
    { x: 12.72, y: 26.61, z: 29.07 },
    { x: -5.06, y: 26.02, z: 32.96 },
    { x: -39.63, y: 28.02, z: -22.16 },
    { x: -33.77, y: 28.02, z: -33.43 },
    { x: -24.74, y: 30.02, z: -30.86 }
  ],
  jungle: [
    { x: -22.65, y: 24.04, z: -5.54 },
    { x: -25.7, y: 25.97, z: -20.15 },
    { x: -35.7, y: 26.02, z: -18.83 },
    { x: 13.15, y: 24.02, z: 12.05 },
    { x: 12.72, y: 26.61, z: 29.07 },
    { x: -5.06, y: 26.02, z: 32.96 },
    { x: -39.63, y: 28.02, z: -22.16 },
    { x: -33.77, y: 28.02, z: -33.43 },
    { x: -24.74, y: 30.02, z: -30.86 }
  ]
};

export function resolveLocationKey(raw) {
  if (!raw) return null;
  const normalized = String(raw).toLowerCase().trim();
  if (normalized.includes("forest")) return "forest_paths";
  return normalized.replace(/\s+/g, "_");
}

export function pickLocationTarget(locationKey) {
  const key = resolveLocationKey(locationKey);
  if (!key || !LOCATION_TARGETS[key]) {
    return null;
  }
  const pool = LOCATION_TARGETS[key];
  const choice = pool[Math.floor(Math.random() * pool.length)];
  return { location: key, position: choice };
}
