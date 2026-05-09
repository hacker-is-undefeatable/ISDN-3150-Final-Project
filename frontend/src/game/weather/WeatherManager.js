import weatherPresets from "../data/weatherPresets.json";

const presetMap = new Map(weatherPresets.map((preset) => [preset.id, preset]));

export function getWeatherPreset(id) {
  return presetMap.get(id) || presetMap.get("clear");
}

export function resolveWeatherTarget(currentId, nextId) {
  if (currentId === nextId) {
    return getWeatherPreset(currentId);
  }
  return getWeatherPreset(nextId);
}
