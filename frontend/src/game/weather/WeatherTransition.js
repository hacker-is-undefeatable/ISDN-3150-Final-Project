export function lerp(current, target, speed) {
  return current + (target - current) * speed;
}

export function blendColor(current, target, speed) {
  return {
    r: lerp(current.r, target.r, speed),
    g: lerp(current.g, target.g, speed),
    b: lerp(current.b, target.b, speed)
  };
}
