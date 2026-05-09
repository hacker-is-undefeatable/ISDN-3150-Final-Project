import { getPrefab } from "./prefabRegistry";
import { spawnPrefab } from "./prefabSpawners";

export function triggerEvent({ spawnEvent, location }, context) {
  const prefab = getPrefab(spawnEvent);
  if (!prefab) {
    return { status: "missing", spawnEvent };
  }

  spawnPrefab(prefab, { ...context, location });
  return { status: "spawned", spawnEvent, location };
}
