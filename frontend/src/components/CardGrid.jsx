import React from "react";
import CardShardImage from "./CardShardImage";

export default function CardGrid({ character, cards, collectedCount, onCardSelect }) {
  const isUnlocked = Boolean(character?.unlocked) || collectedCount >= 8;

  return (
    <article className={`card-collection ${isUnlocked ? "card-collection--unlocked" : "card-collection--locked"}`}>
      <div className="card-collection__header">
        <div>
          <h3 className="card-collection__title">{character?.label || character?.name || "Character"}</h3>
          <p className="card-collection__subtitle">
            {isUnlocked
              ? `${collectedCount}/8 cards collected`
              : "Collect all 8 cards to unlock this character"}
          </p>
        </div>
        <div className={`card-collection__badge ${isUnlocked ? "card-collection__badge--unlocked" : "card-collection__badge--locked"}`}>
          {isUnlocked ? "Unlocked" : "Locked"}
        </div>
      </div>

      <div className="card-collection__grid">
        {cards.map((card, index) => {
          const cardNumber = card.card_index + 1 || index + 1;
          const shardCount = Number(card.shardCount) || 0;
          const unlocked = shardCount >= 4;
          const cardImage = card.image_path || card.image || card.thumbnail;
          const handleSelect = () => {
            if (onCardSelect) {
              onCardSelect(card, character, cardNumber);
            }
          };

          return (
            <button
              type="button"
              key={card.id || `${character?.id}-${index}`}
              className={`card-collection__card card-collection__card-btn ${unlocked ? "card-collection__card--unlocked" : "card-collection__card--locked"}`}
              onClick={handleSelect}
            >
              <div className="card-collection__art">
                {cardImage ? (
                  <CardShardImage
                    imageUrl={cardImage}
                    shardCount={shardCount}
                    totalShards={4}
                    className="card-shard--thumb"
                  />
                ) : null}
                <div className={`card-collection__fallback ${unlocked ? "" : "card-collection__fallback--locked"}`} style={{ display: cardImage ? "none" : "flex" }}>
                  Card {cardNumber}
                </div>
              </div>
              <div className="card-collection__label">Card {cardNumber}</div>
            </button>
          );
        })}
      </div>
    </article>
  );
}
