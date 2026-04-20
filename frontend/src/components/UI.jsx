export default function UI({
  escaped,
  cameraMode,
  selectedObject,
  currentPuzzle,
  answer,
  hint,
  feedback,
  playerCoords,
  loadingPuzzle,
  checkingAnswer,
  fetchingHint,
  onAnswerChange,
  onSubmitAnswer,
  onHint,
  onToggleCameraMode,
}) {
  const formatCoord = (value) =>
    Number.isFinite(value) ? value.toFixed(2) : "--";

  return (
    <>
      <div className="ui-panel">
        <h1>AI 3D Escape Room</h1>
        <div className="mode-row">
          <span>
            <strong>Mode:</strong> {cameraMode === "first-person" ? "First Person" : "Third Person"}
          </span>
          <button className="mode-button" onClick={onToggleCameraMode}>
            Switch Mode
          </button>
        </div>
        <p className="controls-tip">Move with WASD or arrow keys.</p>

        {escaped && <div className="win-banner">You Escaped!</div>}

        {!selectedObject && <p>Click the painting, safe, or door to start.</p>}

        {selectedObject && (
          <div>
            <p>
              <strong>Selected:</strong> {selectedObject}
            </p>

            {loadingPuzzle && <p>Loading puzzle...</p>}

            {currentPuzzle && (
              <div className="puzzle-block">
                <p>
                  <strong>Puzzle:</strong> {currentPuzzle}
                </p>
                <input
                  type="text"
                  value={answer}
                  onChange={(event) => onAnswerChange(event.target.value)}
                  placeholder="Enter answer"
                />
                <div className="button-row">
                  <button onClick={onSubmitAnswer} disabled={checkingAnswer}>
                    {checkingAnswer ? "Checking..." : "Submit Answer"}
                  </button>
                  <button onClick={onHint} disabled={fetchingHint}>
                    {fetchingHint ? "Getting Hint..." : "Hint"}
                  </button>
                </div>
              </div>
            )}

            {hint && (
              <p className="hint-text">
                <strong>Hint:</strong> {hint}
              </p>
            )}
          </div>
        )}

        {feedback && <p className="feedback">{feedback}</p>}
      </div>

      <div className="coords-hud" aria-live="polite">
        <span className="coords-label">Position</span>
        <span className="coords-value">
          X: {formatCoord(playerCoords?.x)} Y: {formatCoord(playerCoords?.y)} Z: {formatCoord(playerCoords?.z)}
        </span>
      </div>
    </>
  );
}
