import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Room from "./components/Room";
import UI from "./components/UI";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
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

  const objectSolved = useMemo(() => {
    return {
      painting: safeOpened,
      safe: doorUnlocked,
      door: doorUnlocked,
    };
  }, [safeOpened, doorUnlocked]);

  const escaped = safeOpened && doorUnlocked;

  const startGame = async () => {
    try {
      setStartingGame(true);
      setFeedback("");

      await fetchJson(`${API_BASE_URL}/reset_game`, {
        method: "POST",
      });

      setDoorUnlocked(false);
      setSafeOpened(false);
      setCurrentPuzzle(null);
      setSelectedObject(null);
      setAnswer("");
      setHint("");
      setGameStarted(true);
    } catch (error) {
      setFeedback(`Error starting game: ${error.message}`);
    } finally {
      setStartingGame(false);
    }
  };

  const loadPuzzle = async (objectType) => {
    try {
      setLoadingPuzzle(true);
      setSelectedObject(objectType);
      setFeedback("");
      setHint("");
      setAnswer("");

      const data = await fetchJson(`${API_BASE_URL}/generate_puzzle`, {
        method: "POST",
        body: JSON.stringify({ object_type: objectType }),
      });

      setCurrentPuzzle(data.question);
    } catch (error) {
      setFeedback(`Error loading puzzle: ${error.message}`);
    } finally {
      setLoadingPuzzle(false);
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
            <ambientLight intensity={0.5} />
            <directionalLight position={[4, 8, 2]} intensity={1.2} castShadow />
            <Room
              doorUnlocked={doorUnlocked}
              safeOpened={safeOpened}
              onObjectClick={loadPuzzle}
            />
            <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.1} />
          </Canvas>

          <UI
            escaped={escaped}
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
          />

          <div className="status-badge">
            <span>Door: {doorUnlocked ? "Unlocked" : "Locked"}</span>
            <span>Safe: {safeOpened ? "Opened" : "Locked"}</span>
          </div>
        </>
      )}
    </div>
  );
}
