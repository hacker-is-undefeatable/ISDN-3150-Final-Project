import React from "react";

export default function CardShardImage({ imageUrl, shardCount = 0, totalShards = 4, className = "" }) {
  const safeCount = Math.max(0, Math.min(totalShards, Number(shardCount) || 0));

  return (
    <div className={`card-shard ${className}`}>
      {Array.from({ length: totalShards }).map((_, index) => (
        <div
          key={index}
          className={`card-shard__piece card-shard__piece--${index} ${
            index < safeCount ? "card-shard__piece--collected" : "card-shard__piece--missing"
          }`}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ))}
    </div>
  );
}
