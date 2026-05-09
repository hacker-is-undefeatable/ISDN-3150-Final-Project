export default function RunSummaryScreen({ summary }) {
  if (!summary) return null;

  return (
    <div className="run-summary">
      <div className="run-summary__card">
        <h2>Expedition Summary</h2>
        <div className="run-summary__grid">
          <div>
            <span>Objectives Completed</span>
            <strong>{summary.objectivesCompleted}</strong>
          </div>
          <div>
            <span>Corruption</span>
            <strong>{summary.corruption}</strong>
          </div>
          <div>
            <span>Danger</span>
            <strong>{summary.danger}</strong>
          </div>
          <div>
            <span>Duration</span>
            <strong>{summary.durationLabel}</strong>
          </div>
          <div>
            <span>Result</span>
            <strong>{summary.result.toUpperCase()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
