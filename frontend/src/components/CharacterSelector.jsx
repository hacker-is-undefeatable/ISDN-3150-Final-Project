import React from "react";

export default function CharacterSelector({ characters, selectedCharacter, onSelect }) {
  return (
    <div className="character-scroll">
      <div className="character-row">
        {characters.map((c, idx) => {
          const active = selectedCharacter === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`character-card ${!c.unlocked ? "character-card--locked" : ""} ${
                active ? "character-card--active" : ""
              }`}
              title={c.id}
            >
              <div className="character-card__thumb">{`Char ${String(idx).padStart(2, "0")}`}</div>
              <div className="character-card__label">{c.unlocked ? "Unlocked" : "Locked"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
