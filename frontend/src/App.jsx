import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import UI from "./components/UI";
import PlayerRig from "./components/PlayerRig";
import Terrain from "./components/Terrain";
import ExplorationSpots from "./components/ExplorationSpots";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const START_RESET_TIMEOUT_MS = 4000;
const SPOT_COUNT = 5;
const SPOT_TRIGGER_RADIUS = 2.4;
const SPOT_MIN_DISTANCE = 3.6;
const SPOT_EDGE_MARGIN = 2.4;
const GROUND_RAYCAST_HEIGHT = 80;
const SPOT_GROUND_NORMAL_MIN_Y = 0.3;
const MAX_SPOT_GENERATION_ATTEMPTS = 400;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json();
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), ms);
    }),
  ]);
}

export default function App() {
  const terrainCollidersRef = useRef({ ground: [], walls: [] });

  const [gameStarted, setGameStarted] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [cameraMode, setCameraMode] = useState("third-person");
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState("");
  const [loadingPuzzle, setLoadingPuzzle] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [fetchingHint, setFetchingHint] = useState(false);
  const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0, z: 2 });
  const [mapBounds, setMapBounds] = useState({
    minX: -25,
    maxX: 25,
    minZ: -25,
    maxZ: 25,
  });
  const [nearSpotId, setNearSpotId] = useState(null);
  const [completedSpots, setCompletedSpots] = useState([]);
  const [explorationSpots, setExplorationSpots] = useState([]);
  const [pendingSpotGeneration, setPendingSpotGeneration] = useState(false);

  const escaped =
    explorationSpots.length > 0 && completedSpots.length >= explorationSpots.length;

  const toggleCameraMode = () => {
    setCameraMode((prev) => (prev === "first-person" ? "third-person" : "first-person"));
  };

  const loadSpotPuzzle = async (spotId) => {
    if (!spotId) return;

    try {
      setLoadingPuzzle(true);
      setFeedback("");
      setHint("");
      setSelectedObject(spotId);

      const data = await fetchJson(`${API_BASE_URL}/generate_puzzle`, {
        method: "POST",
        body: JSON.stringify({
          object_type: spotId,
          hint_only: false,
        }),
      });

      setCurrentPuzzle(data.question);
    } catch (error) {
      setFeedback(`Error generating spot question: ${error.message}`);
    } finally {
      setLoadingPuzzle(false);
    }
  };

  const startGame = async () => {
    // Enter gameplay immediately so start is responsive even if backend is slow.
    setGameStarted(true);
    setCurrentPuzzle(null);
    setSelectedObject(null);
    setAnswer("");
    setHint("");
    setPlayerCoords({ x: 0, y: 0, z: 2 });
    setNearSpotId(null);
    setCompletedSpots([]);
    setExplorationSpots([]);
    setPendingSpotGeneration(true);

    try {
      setStartingGame(true);
      setFeedback("");

      await withTimeout(
        fetchJson(`${API_BASE_URL}/reset_game`, {
          method: "POST",
        }),
        START_RESET_TIMEOUT_MS
      );
    } catch (error) {
      setFeedback(
        `Started in local mode (backend reset skipped): ${error.message}`
      );
    } finally {
      setStartingGame(false);
    }
  };

  const generateRandomGroundSpots = () => {
    const colliders = terrainCollidersRef.current?.ground?.length
      ? terrainCollidersRef.current.ground
      : terrainCollidersRef.current?.walls || [];

    if (!colliders.length) return [];

    const minX = mapBounds.minX + SPOT_EDGE_MARGIN;
    const maxX = mapBounds.maxX - SPOT_EDGE_MARGIN;
    const minZ = mapBounds.minZ + SPOT_EDGE_MARGIN;
    const maxZ = mapBounds.maxZ - SPOT_EDGE_MARGIN;

    if (!(maxX > minX) || !(maxZ > minZ)) {
      return [];
    }

    const raycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3();
    const rayDirection = new THREE.Vector3(0, -1, 0);
    const surfaceNormal = new THREE.Vector3();
    const intersections = [];

    const sampleGroundY = (x, z) => {
      rayOrigin.set(x, GROUND_RAYCAST_HEIGHT, z);
      raycaster.set(rayOrigin, rayDirection);
      raycaster.near = 0;
      raycaster.far = GROUND_RAYCAST_HEIGHT * 2;

      intersections.length = 0;
      const hits = raycaster.intersectObjects(colliders, true, intersections);

      for (const hit of hits) {
        if (!hit?.point) continue;
        if (!hit.face) return hit.point.y;

        surfaceNormal
          .copy(hit.face.normal)
          .transformDirection(hit.object.matrixWorld);

        if (surfaceNormal.y >= SPOT_GROUND_NORMAL_MIN_Y) {
          return hit.point.y;
        }
      }

      return null;
    };

    const spots = [];
    const minDistanceSquared = SPOT_MIN_DISTANCE * SPOT_MIN_DISTANCE;

    const tryCandidate = (enforceSpacing) => {
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      const y = sampleGroundY(x, z);

      if (!Number.isFinite(y)) return false;

      if (enforceSpacing) {
        for (const spot of spots) {
          const dx = spot.position[0] - x;
          const dz = spot.position[2] - z;
          if (dx * dx + dz * dz < minDistanceSquared) {
            return false;
          }
        }
      }

      spots.push({ position: [x, y, z] });
      return true;
    };

    let attempts = 0;
    while (spots.length < SPOT_COUNT && attempts < MAX_SPOT_GENERATION_ATTEMPTS) {
      attempts += 1;
      tryCandidate(true);
    }

    attempts = 0;
    while (spots.length < SPOT_COUNT && attempts < MAX_SPOT_GENERATION_ATTEMPTS / 2) {
      attempts += 1;
      tryCandidate(false);
    }

    return spots.map((spot, index) => ({
      id: `spot_${index + 1}`,
      label: `Spot ${index + 1}`,
      position: spot.position,
    }));
  };

  useEffect(() => {
    if (!gameStarted || !pendingSpotGeneration) return;

    const spots = generateRandomGroundSpots();
    if (spots.length !== SPOT_COUNT) return;

    setExplorationSpots(spots);
    setPendingSpotGeneration(false);
  }, [gameStarted, pendingSpotGeneration, mapBounds]);

  useEffect(() => {
    if (!gameStarted || explorationSpots.length === 0) {
      setNearSpotId(null);
      return;
    }

    const radiusSquared = SPOT_TRIGGER_RADIUS * SPOT_TRIGGER_RADIUS;
    let nearestSpotId = null;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const spot of explorationSpots) {
      const dx = playerCoords.x - spot.position[0];
      const dz = playerCoords.z - spot.position[2];
      const distanceSquared = dx * dx + dz * dz;

      if (distanceSquared <= radiusSquared && distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestSpotId = spot.id;
      }
    }

    setNearSpotId(nearestSpotId);
  }, [gameStarted, playerCoords, explorationSpots]);

  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "e") return;
      if (loadingPuzzle || checkingAnswer || fetchingHint) return;

      event.preventDefault();

      if (!nearSpotId) {
        setFeedback("Move near an exploration spot and press E.");
        return;
      }

      void loadSpotPuzzle(nearSpotId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameStarted, nearSpotId, loadingPuzzle, checkingAnswer, fetchingHint]);

  const submitAnswer = async () => {
    if (!selectedObject || !answer.trim()) {
      setFeedback("Press E near a spot first, then enter an answer.");
      return;
    }

    try {
      setCheckingAnswer(true);
      setFeedback("");

      const data = await fetchJson(`${API_BASE_URL}/check_answer`, {
        method: "POST",
        body: JSON.stringify({
          object_type: selectedObject,
          answer: answer.trim(),
        }),
      });

      setFeedback(data.message);
      setCompletedSpots(data.state?.explored_spots || []);

      if (data.correct) {
        setCurrentPuzzle(null);
        setAnswer("");
        setHint("");
      }
    } catch (error) {
      setFeedback(`Error checking answer: ${error.message}`);
    } finally {
      setCheckingAnswer(false);
    }
  };

  const getHint = async () => {
    if (!selectedObject) {
      setFeedback("Press E near an exploration spot first.");
      return;
    }

    try {
      setFetchingHint(true);
      const data = await fetchJson(`${API_BASE_URL}/generate_puzzle`, {
        method: "POST",
        body: JSON.stringify({
          object_type: selectedObject,
          hint_only: true,
        }),
      });
      setHint(data.hint);
    } catch (error) {
      setFeedback(`Error fetching hint: ${error.message}`);
    } finally {
      setFetchingHint(false);
    }
  };

  return (
    <div className="app-root">
      {!gameStarted ? (
        <div className="start-screen">
          <div className="start-card">
            <h1>AI 3D Escape Room</h1>
            <p>Explore 5 checkpoints, press E near each spot, and solve AI math questions.</p>
            <button
              className="start-button"
              onClick={startGame}
              disabled={startingGame}
            >
              {startingGame ? "Starting..." : "Start Game"}
            </button>
            {feedback && <p className="start-error">{feedback}</p>}
          </div>
        </div>
      ) : (
        <>
          <Canvas camera={{ position: [0, 3, 8], fov: 60 }}>
            <color attach="background" args={["#101418"]} />
            <ambientLight intensity={0.35} />
            <hemisphereLight
              skyColor="#bfd6f6"
              groundColor="#344038"
              intensity={0.7}
            />
            <directionalLight
              position={[12, 20, 10]}
              intensity={1.1}
            />
            <directionalLight position={[-8, 10, -12]} intensity={0.35} />
            <Terrain
              collidersRef={terrainCollidersRef}
              onMapBoundsChange={setMapBounds}
            />
            <ExplorationSpots
              spots={explorationSpots}
              nearSpotId={nearSpotId}
              completedSpotIds={completedSpots}
            />
            <PlayerRig
              mode={cameraMode}
              terrainCollidersRef={terrainCollidersRef}
              onPositionChange={setPlayerCoords}
            />
          </Canvas>

          <UI
            escaped={escaped}
            cameraMode={cameraMode}
            selectedObject={selectedObject}
            currentPuzzle={currentPuzzle}
            answer={answer}
            hint={hint}
            feedback={feedback}
            playerCoords={playerCoords}
            mapBounds={mapBounds}
            explorationSpots={explorationSpots}
            completedSpotIds={completedSpots}
            nearSpotId={nearSpotId}
            completedSpotsCount={completedSpots.length}
            totalSpots={SPOT_COUNT}
            loadingPuzzle={loadingPuzzle}
            checkingAnswer={checkingAnswer}
            fetchingHint={fetchingHint}
            onAnswerChange={setAnswer}
            onSubmitAnswer={submitAnswer}
            onHint={getHint}
            onToggleCameraMode={toggleCameraMode}
          />
        </>
      )}
    </div>
  );
}
