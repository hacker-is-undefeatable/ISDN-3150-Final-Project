export function toDegrees(rad) {
  return ((rad * 180) / Math.PI + 360) % 360;
}

export function vectorToBearingDeg(from, to) {
  // from and to are { x, y, z } or arrays
  const fx = Array.isArray(from) ? from[0] : from.x;
  const fz = Array.isArray(from) ? from[2] : from.z;
  const tx = Array.isArray(to) ? to[0] : to.x;
  const tz = Array.isArray(to) ? to[2] : to.z;
  const dx = tx - fx;
  const dz = tz - fz;
  const rad = Math.atan2(dx, dz); // note: atan2(x,z) so 0 = north
  return toDegrees(rad);
}

export function bearingToCardinal(deg) {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "N";
  if (normalized < 67.5) return "NE";
  if (normalized < 112.5) return "E";
  if (normalized < 157.5) return "SE";
  if (normalized < 202.5) return "S";
  if (normalized < 247.5) return "SW";
  if (normalized < 292.5) return "W";
  return "NW";
}
