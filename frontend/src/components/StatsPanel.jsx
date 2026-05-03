import React from "react";

export default function StatsPanel({ stats }) {
  return (
    <div className="stats-panel">
      <div className="stats-panel__title">Stats</div>
      <div className="stats-panel__grid">
        <div className="stats-panel__item">
          <div className="stats-panel__label">Cards Unlocked</div>
          <div className="stats-panel__value">{stats.cardsUnlocked}</div>
        </div>
        <div className="stats-panel__item">
          <div className="stats-panel__label">Runs Played</div>
          <div className="stats-panel__value">{stats.runsPlayed}</div>
        </div>
        <div className="stats-panel__item">
          <div className="stats-panel__label">Best Score</div>
          <div className="stats-panel__value">{stats.bestScore}</div>
        </div>
      </div>
    </div>
  );
}
