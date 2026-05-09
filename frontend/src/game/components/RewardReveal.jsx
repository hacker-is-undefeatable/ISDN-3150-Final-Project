export default function RewardReveal({ reward }) {
  if (!reward) return null;

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
