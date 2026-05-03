import React from "react";

export default function CharacterGrid({ characters, selected, onSelect }) {
  return (
    <div className="character-grid">
      {characters.map((c, idx) => {
        const modelCode = c.code || `model${String(idx).padStart(5, "0")}`;
        const imgName = c.image_path || `/character-img-${modelCode.replace("model", "")}.png`;
        const active = selected === modelCode;
        const locked = !c.unlocked;

        return (
          <div
            key={modelCode}
            className={`character-grid__item ${active ? "character-grid__item--active" : ""} ${locked ? "character-grid__item--locked" : ""}`}
          >
            <button
              className="character-grid__btn"
              onClick={() => {
                if (locked) return;
                onSelect(modelCode);
              }}
              disabled={locked}
              aria-disabled={locked}
              title={locked ? "Locked character" : c.label || modelCode}
            >
              <div className="character-grid__img-wrap">
                <img
                  src={imgName}
                  alt={c.label || modelCode}
                  className="character-grid__img"
                  onError={(e) => {
                    e.currentTarget.style.opacity = 0.25;
                  }}
                />
                {locked && (
                  <div className="character-grid__lock-overlay" aria-hidden="true">
                    <img src="/lock.png" alt="Locked" className="character-grid__lock-icon" />
                  </div>
                )}
              </div>
              <div className="character-grid__name">{c.label || modelCode}</div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
