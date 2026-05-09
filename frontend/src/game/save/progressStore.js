const STORAGE_KEY = "island_expedition_progress";

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function saveProgress(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // ignore storage errors
  }
}

export function ensureProgress() {
  return (
    loadProgress() || {
      unlockedCharacters: [],
      discoveredEvents: [],
      runHistory: [],
      stats: {
        runsCompleted: 0,
        bestRunDuration: 0
      }
    }
  );
}

export function unlockCharacter(cardId) {
  const progress = ensureProgress();
  if (!progress.unlockedCharacters.includes(cardId)) {
    progress.unlockedCharacters.push(cardId);
  }
  saveProgress(progress);
  return progress;
}

export function addRunHistory(entry) {
  const progress = ensureProgress();
  progress.runHistory.push(entry);
  progress.stats.runsCompleted += entry.result === "win" ? 1 : 0;
  if (entry.durationMs && entry.durationMs > progress.stats.bestRunDuration) {
    progress.stats.bestRunDuration = entry.durationMs;
  }
  saveProgress(progress);
  return progress;
}
