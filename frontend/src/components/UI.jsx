export default function UI({
  escaped,
  cameraMode,
  selectedObject,
  currentPuzzle,
  answer,
  hint,
  feedback,
  playerCoords,
  mapBounds,
  explorationSpots,
  completedSpotIds,
  nearSpotId,
  completedSpotsCount,
  totalSpots,
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

  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  const getMapPositionStyle = (x, z) => {
    const minX = mapBounds?.minX;
    const maxX = mapBounds?.maxX;
    const minZ = mapBounds?.minZ;
    const maxZ = mapBounds?.maxZ;

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(minZ) ||
      !Number.isFinite(maxZ) ||
      !Number.isFinite(x) ||
      !Number.isFinite(z)
    ) {
      return { left: "50%", top: "50%" };
    }

    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;

    if (spanX <= 0 || spanZ <= 0) {
      return { left: "50%", top: "50%" };
    }

    const xNorm = clamp01((x - minX) / spanX);
    const zNorm = clamp01((z - minZ) / spanZ);

    return {
      left: `${(xNorm * 100).toFixed(1)}%`,
      top: `${((1 - zNorm) * 100).toFixed(1)}%`,
    };
  };

  const getMarkerStyle = () => {
    return getMapPositionStyle(playerCoords?.x, playerCoords?.z);
  };

  const markerStyle = getMarkerStyle();
  const completedSpotSet = new Set(completedSpotIds || []);
  const selectedLabel = selectedObject
    ? selectedObject.replace("_", " ").toUpperCase()
    : null;
  const nearLabel = nearSpotId
    ? nearSpotId.replace("_", " ").toUpperCase()
    : null;

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
        <p className="controls-tip">Move with WASD or arrow keys. Press E near a glowing spot.</p>
        <p className="progress-text">
          <strong>Explored:</strong> {completedSpotsCount}/{totalSpots}
        </p>

        {nearLabel ? (
          <p className="interaction-tip">
            <strong>Nearby:</strong> Press E to explore {nearLabel}.
          </p>
        ) : (
          <p className="interaction-tip">Move close to a glowing exploration spot to interact.</p>
        )}

        {escaped && <div className="win-banner">You Escaped!</div>}

        {!selectedObject && <p>No active spot yet. Use E when you are near a spot.</p>}

        {selectedObject && (
          <div>
            <p>
              <strong>Selected:</strong> {selectedLabel}
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

      <div className="minimap-hud" aria-label="Minimap">
        <div className="minimap-title">Map</div>
        <div className="minimap-canvas">
          <div className="minimap-grid" />
          <div className="minimap-spots-layer">
            {(explorationSpots || []).map((spot) => {
              const [spotX, , spotZ] = spot.position || [];
              const spotStyle = getMapPositionStyle(spotX, spotZ);
              const isNear = nearSpotId === spot.id;
              const isCompleted = completedSpotSet.has(spot.id);
              const stateClass = isCompleted
                ? "minimap-spot-completed"
                : isNear
                ? "minimap-spot-near"
                : "minimap-spot-default";

              return (
                <div
                  key={spot.id}
                  className={`minimap-spot ${stateClass}`}
                  style={spotStyle}
                  title={spot.label || spot.id}
                />
              );
            })}
          </div>
          <div className="minimap-marker" style={markerStyle} />
        </div>
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
