import React from "react";

const SCENES = [
  { id: "dungeon", name: "Dungeon", desc: "Dark halls and hidden traps." },
  { id: "beach", name: "Beach", desc: "Sandy shores and seaside puzzles." },
  { id: "castle", name: "Castle", desc: "Royal halls and secret chambers." },
];

export default function SceneSelector({ selectedScene, onSelect }) {
  return (
    <div className="scene-grid">
      {SCENES.map((s) => {
        const active = selectedScene === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`scene-card ${active ? "scene-card--active" : ""}`}
          >
            <div className="scene-card__title">{s.name}</div>
            <div className="scene-card__desc">{s.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
