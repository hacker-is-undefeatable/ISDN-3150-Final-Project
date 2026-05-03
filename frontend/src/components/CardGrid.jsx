import React from "react";

export default function CardGrid({ cards }) {
  return (
    <div className="collection-grid">
      {cards.map((c, i) => (
        <div key={i} className={`collection-card ${c ? "collection-card--unlocked" : ""}`}>
          {c ? `Card ${i + 1}` : "Locked"}
        </div>
      ))}
    </div>
  );
}
