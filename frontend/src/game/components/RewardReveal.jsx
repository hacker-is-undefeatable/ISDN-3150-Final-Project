export default function RewardReveal({ reward }) {
  if (!reward) return null;

  if (reward.type === "shards") {
    return (
      <div className="reward-reveal">
        <div className="reward-card reward-card--common">
          <div className="reward-card__eyebrow">Reward</div>
          <h2>{reward.total || 0} Shards Collected</h2>
          {reward.shards?.length ? (
            <div className="reward-card__list">
              {reward.shards.map((entry) => (
                <div key={entry.shardKey} className="reward-card__list-item">
                  <span>{entry.name}</span>
                  <strong>+{entry.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p>All shards are already collected.</p>
          )}
          <div className="reward-card__rarity">shards</div>
        </div>
      </div>
    );
  }

  return (
    <div className="reward-reveal">
      <div className={`reward-card reward-card--${reward.rarity}`}>
        <div className="reward-card__eyebrow">Reward</div>
        <h2>{reward.cardId}</h2>
        <p>{reward.reason || "A new character joins your roster."}</p>
        <div className="reward-card__rarity">{reward.rarity}</div>
      </div>
    </div>
  );
}
