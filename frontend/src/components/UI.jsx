export default function UI({
  escaped,
  cameraMode,
  autoMove,
  currentMoveKey,
  selectedObject,
  currentPuzzle,
  answer,
  hint,
  feedback,
  loadingPuzzle,
  checkingAnswer,
  fetchingHint,
  onAnswerChange,
  onSubmitAnswer,
  onHint,
  onToggleCameraMode,
  onToggleAutoMove,
}) {
  return (
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
      <div className="mode-row">
        <span>
          <strong>Auto Move:</strong> {autoMove ? "Enabled" : "Disabled"}
        </span>
        <button className="mode-button" onClick={onToggleAutoMove}>
          {autoMove ? "Disable" : "Enable"}
        </button>
      </div>
      <p className="controls-tip">Move with WASD or arrow keys.</p>
      {autoMove && (
        <p className="controls-tip">
          AI movement output: <strong>{currentMoveKey}</strong>
        </p>
      )}

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
  );
}
