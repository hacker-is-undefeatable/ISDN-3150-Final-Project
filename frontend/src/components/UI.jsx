export default function UI({
  cameraMode,
  playerCoords,
  mapBounds,
  npcPosition,
  objectiveTarget,
  extractionTarget,
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
  const npcStyle = npcPosition
    ? {
        ...getMapPositionStyle(npcPosition.x, npcPosition.z),
        position: "absolute",
        transform: "translate(-50%, -50%)",
        width: 0,
        height: 0,
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderBottom: "12px solid #ffd166",
        filter: "drop-shadow(0 0 6px rgba(255, 209, 102, 0.9))"
      }
    : null;
  const objectiveStyles = (objectiveTarget || []).map((target) => ({
    id: target.id,
    style: {
      ...getMapPositionStyle(target.position.x, target.position.z),
      position: "absolute",
      width: "10px",
      height: "10px",
      background: "#9bffcf",
      border: "2px solid rgba(7, 16, 24, 0.7)",
      borderRadius: "3px",
      transform: "translate(-50%, -50%) rotate(45deg)",
      boxShadow: "0 0 8px rgba(155, 255, 207, 0.8)"
    }
  }));
  const extractionStyle = extractionTarget?.position
    ? {
        ...getMapPositionStyle(extractionTarget.position.x, extractionTarget.position.z),
        position: "absolute",
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        border: "2px solid rgba(255, 255, 255, 0.7)",
        background: "#ff8e8e",
        transform: "translate(-50%, -50%)",
        boxShadow: "0 0 10px rgba(255, 142, 142, 0.8)"
      }
    : null;
  const yawRad = Number.isFinite(playerCoords?.viewYaw)
    ? playerCoords.viewYaw
    : Number.isFinite(playerCoords?.yaw)
    ? playerCoords.yaw
    : 0;
  const fovRotationDeg = 180 - (yawRad * 180) / Math.PI;
  return (
    <>
      <div className="ui-panel">
        <h1>Island Expedition</h1>
        <div className="mode-row">
          <span>
            <strong>Mode:</strong> {cameraMode === "first-person" ? "First Person" : "Third Person"}
          </span>
          <button className="mode-button" onClick={onToggleCameraMode}>
            Switch Mode
          </button>
        </div>
        <p className="controls-tip">Move with WASD or arrow keys. Explore freely.</p>
      </div>

      <div className="minimap-hud" aria-label="Minimap">
        <div className="minimap-title">Map</div>
        <div className="minimap-canvas">
          <div className="minimap-grid" />
          {npcStyle && <div className="minimap-npc" style={npcStyle} />}
          {objectiveStyles.map((entry) => (
            <div key={entry.id} className="minimap-objective" style={entry.style} />
          ))}
          {extractionStyle && (
            <div className="minimap-extraction" style={extractionStyle} />
          )}
          <div
            className="minimap-fov"
            style={{
              ...markerStyle,
              transform: `translate(-50%, -50%) rotate(${fovRotationDeg}deg)`,
            }}
          />
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
