export default function UI({
  escaped,
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
}) {
  return (
    <div className="ui-panel">
      <h1>AI 3D Escape Room</h1>

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
