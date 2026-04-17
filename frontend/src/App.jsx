import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import UI from "./components/UI";
import PlayerRig from "./components/PlayerRig";
import Terrain from "./components/Terrain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const START_RESET_TIMEOUT_MS = 4000;

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
  const terrainCollidersRef = useRef([]);

  const [gameStarted, setGameStarted] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [cameraMode, setCameraMode] = useState("third-person");
  const [doorUnlocked, setDoorUnlocked] = useState(false);
  const [safeOpened, setSafeOpened] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState("");
  const [loadingPuzzle, setLoadingPuzzle] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [fetchingHint, setFetchingHint] = useState(false);

  const escaped = safeOpened && doorUnlocked;

  const toggleCameraMode = () => {
    setCameraMode((prev) => (prev === "first-person" ? "third-person" : "first-person"));
  };

  const startGame = async () => {
    // Enter gameplay immediately so start is responsive even if backend is slow.
    setGameStarted(true);
    setDoorUnlocked(false);
    setSafeOpened(false);
    setCurrentPuzzle(null);
    setSelectedObject(null);
    setAnswer("");
    setHint("");

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

  const submitAnswer = async () => {
    if (!selectedObject || !answer.trim()) {
      setFeedback("Please enter an answer.");
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
      setDoorUnlocked(data.state.door_unlocked);
      setSafeOpened(data.state.safe_opened);

      if (data.correct) {
        setCurrentPuzzle(null);
        setAnswer("");
      }
    } catch (error) {
      setFeedback(`Error checking answer: ${error.message}`);
    } finally {
      setCheckingAnswer(false);
    }
  };

  const getHint = async () => {
    if (!selectedObject) {
      setFeedback("Select an object first.");
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
            <p>Solve Python puzzles hidden in the room and escape.</p>
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
            <Terrain collidersRef={terrainCollidersRef} />
            <PlayerRig mode={cameraMode} terrainCollidersRef={terrainCollidersRef} />
          </Canvas>

          <UI
            escaped={escaped}
            cameraMode={cameraMode}
            selectedObject={selectedObject}
            currentPuzzle={currentPuzzle}
            answer={answer}
            hint={hint}
            feedback={feedback}
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
