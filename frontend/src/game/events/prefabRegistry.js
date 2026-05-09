import prefabs from "../data/prefabs.json";

const prefabMap = new Map(prefabs.map((prefab) => [prefab.id, prefab]));

export function getPrefab(prefabId) {
  return prefabMap.get(prefabId);
}

export function listPrefabs() {
  return [...prefabMap.values()];
}
