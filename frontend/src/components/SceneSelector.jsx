import React from "react";

const SCENES = [
  { id: "dungeon", name: "Forgotten Ruins", desc: "Explore ancient ruins filled with mysteries and challenges. Discover secrets hidden for centuries.", enabled: true },
  { id: "beach", name: "Coming Soon", desc: "Sandy shores and seaside puzzles.", enabled: false },
  { id: "castle", name: "Coming Soon", desc: "Royal halls and secret chambers.", enabled: false },
];

export default function SceneSelector({ selectedScene, onSelect }) {
  return (
    <div className="scene-grid">
      {SCENES.map((s) => {
        const active = selectedScene === s.id;
        return (
          <button
            key={s.id}
            onClick={() => s.enabled && onSelect(s.id)}
            disabled={!s.enabled}
            className={`scene-card ${active ? "scene-card--active" : ""} ${!s.enabled ? "scene-card--disabled" : ""}`}
          >
            <div className="scene-card__header">
              <div className="scene-card__title">{s.name}</div>
              {!s.enabled && <div className="scene-card__badge">Coming Soon</div>}
            </div>
            <div className="scene-card__desc">{s.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
