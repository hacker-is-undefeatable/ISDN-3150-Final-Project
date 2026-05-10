import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import UI from "./UI";
import PlayerRig from "./PlayerRig";
import Terrain from "./Terrain";
import NPCModel from "./NPCModel";
import WeatherController from "../game/components/WeatherController";
import AudioAtmosphere from "../game/components/AudioAtmosphere";
import { useWorldStore } from "../game/state/worldStore";
import { useRunStore } from "../game/state/runStore";
import SupernaturalGameplayLayer from "../game/components/SupernaturalGameplayLayer";
import RunOrchestrator from "../game/components/RunOrchestrator";
import ObjectiveManager from "../game/components/ObjectiveManager";
import ExtractionManager from "../game/components/ExtractionManager";
import RunOutcomeManager from "../game/components/RunOutcomeManager";

export default function GameScene({ avatarModelPath }) {
  const terrainCollidersRef = useRef({ ground: [], walls: [] });
  const canvasRef = useRef(null);
  const [npcPosition, setNpcPosition] = useState(() => ({ x: 0.9, y: 24.16, z: -3.17 }));
  const [isContextLost, setIsContextLost] = useState(false);

  const [cameraMode, setCameraMode] = useState("third-person");
  const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0, z: 2 });
  const extractionTarget = useWorldStore((state) => state.world.extractionTarget);
  const objectiveTargets = useWorldStore((state) => state.world.objectiveTargets || []);
  const extractionAvailable = useRunStore((state) => state.extractionAvailable);
  const [hudState, setHudState] = useState({
    objectiveText: "Reach the ruins and light the candle ritual.",
    corruption: 0,
    weather: "cloudy",
    ritualIntensity: 0,
    extractionReady: false
  });
  const [mapBounds, setMapBounds] = useState({
    minX: -25,
    maxX: 25,
    minZ: -25,
    maxZ: 25,
  });

  const toggleCameraMode = () => {
    setCameraMode((prev) => (prev === "first-person" ? "third-person" : "first-person"));
  };

  const handleContextLost = useCallback((event) => {
    event.preventDefault();
    setIsContextLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    setIsContextLost(false);
  }, []);

  useEffect(() => {
    setHudState((prev) => ({
      ...prev,
      extractionReady: extractionAvailable
    }));
  }, [extractionAvailable]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
    };
  }, [handleContextLost, handleContextRestored]);

  return (
    <div className="game-shell">
      <Canvas
        camera={{ position: [0, 3, 8], fov: 60 }}
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
          gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        }}
      >
        <color attach="background" args={["#101418"]} />
        <ambientLight name="weather-ambient" intensity={0.35} />
        <hemisphereLight
          name="weather-hemi"
          skyColor="#bfd6f6"
          groundColor="#344038"
          intensity={0.7}
        />
        <directionalLight name="weather-key" position={[12, 20, 10]} intensity={1.1} />
        <directionalLight name="weather-fill" position={[-8, 10, -12]} intensity={0.35} />
        <Terrain collidersRef={terrainCollidersRef} onMapBoundsChange={setMapBounds} />
        <WeatherController />
        <AudioAtmosphere />
        <SupernaturalGameplayLayer playerCoords={playerCoords} onHudChange={setHudState} />
        <RunOrchestrator />
        {npcPosition && (
          <group position={[npcPosition.x, npcPosition.y, npcPosition.z]}>
            <pointLight intensity={1.1} distance={8} color="#ffd166" />
            <NPCModel modelPath="/model/genshin/model_kokomi.vrm" />
          </group>
        )}
        <PlayerRig
          mode={cameraMode}
          terrainCollidersRef={terrainCollidersRef}
          onPositionChange={setPlayerCoords}
          avatarModelPath={avatarModelPath}
        />
      </Canvas>

      <ObjectiveManager playerCoords={playerCoords} />
      <ExtractionManager playerCoords={playerCoords} />

      <RunOutcomeManager />

      {isContextLost && (
        <div className="webgl-warning">
          WebGL context lost. Try closing other tabs or refreshing the page.
        </div>
      )}

      <UI
        cameraMode={cameraMode}
        playerCoords={playerCoords}
        mapBounds={mapBounds}
        npcPosition={npcPosition}
        objectiveTarget={objectiveTargets}
        extractionTarget={extractionTarget}
        hudState={hudState}
        onToggleCameraMode={toggleCameraMode}
      />

    </div>
  );
}
