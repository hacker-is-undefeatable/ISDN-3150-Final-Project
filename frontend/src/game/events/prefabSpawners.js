export function spawnPrefab(prefab, context) {
  if (!prefab) {
    return;
  }

  switch (prefab.id) {
    case "GhostShip":
      context.spawnShip(prefab);
      break;
    case "FogStorm":
      context.spawnFog(prefab);
      break;
    case "ShadowWatcher":
      context.spawnWatcher(prefab);
      break;
    case "RitualCircle":
      context.spawnRitual(prefab);
      break;
    default:
      context.spawnGeneric(prefab);
      break;
  }
}
