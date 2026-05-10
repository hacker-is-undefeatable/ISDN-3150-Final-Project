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
      cardShards: {},
      discoveredEvents: [],
      runHistory: [],
      stats: {
        runsCompleted: 0,
        bestRunDuration: 0
      }
    }
  );
}

export function getShardCount(shardKey) {
  const progress = ensureProgress();
  const count = progress.cardShards?.[shardKey];
  return typeof count === "number" ? count : 0;
}

export function addShards(shardKeys, maxPerCard = 4) {
  const progress = ensureProgress();
  const next = { ...progress, cardShards: { ...(progress.cardShards || {}) } };

  shardKeys.forEach((key) => {
    const current = typeof next.cardShards[key] === "number" ? next.cardShards[key] : 0;
    if (current < maxPerCard) {
      next.cardShards[key] = current + 1;
    }
  });

  saveProgress(next);
  return next;
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
