import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import UI from "./UI";
import PlayerRig from "./PlayerRig";
import Terrain from "./Terrain";
import NPCInteractionManager from "../game/components/NPCInteractionManager";
import NPCModel from "./NPCModel";
import WeatherController from "../game/components/WeatherController";
import EventSpawner from "../game/components/EventSpawner";
import AudioAtmosphere from "../game/components/AudioAtmosphere";
import RunOrchestrator from "../game/components/RunOrchestrator";
import RunObjectivePanel from "../game/components/RunObjectivePanel";
import { useWorldStore } from "../game/state/worldStore";
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
  const objectiveTargets = useWorldStore((state) => state.world.objectiveTargets || []);
  const extractionTarget = useWorldStore((state) => state.world.extractionTarget);
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

  const nearestObjective = useMemo(() => {
    if (!objectiveTargets.length || !playerCoords) return null;
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    objectiveTargets.forEach((target) => {
      if (!target?.position) return;
      const dx = target.position.x - playerCoords.x;
      const dy = target.position.y - playerCoords.y;
      const dz = target.position.z - playerCoords.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = target;
      }
    });
    return best;
  }, [objectiveTargets, playerCoords]);


  return (
    <div className="game-shell">
      <Canvas
        camera={{ position: [0, 3, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
          gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
        <EventSpawner />
        <AudioAtmosphere />
        {npcPosition && (
          <group position={[npcPosition.x, npcPosition.y, npcPosition.z]}>
            <pointLight intensity={1.1} distance={8} color="#ffd166" />
            <NPCModel modelPath="/model/genshin/model_kokomi.vrm" />
          </group>
        )}
        {objectiveTargets.map((target, index) => (
          <group
            key={target.id || `objective_npc_${index}`}
            position={[target.position.x, target.position.y, target.position.z]}
          >
            {nearestObjective?.id === target.id ? (
              <>
                <pointLight intensity={0.9} distance={6} color="#9bffcf" />
                <NPCModel modelPath="/model/genshin/model_kokomi.vrm" />
              </>
            ) : (
              <mesh>
                <sphereGeometry args={[0.35, 14, 14]} />
                <meshStandardMaterial color="#9bffcf" emissive="#2b7a5b" emissiveIntensity={0.6} />
              </mesh>
            )}
          </group>
        ))}
        <PlayerRig
          mode={cameraMode}
          terrainCollidersRef={terrainCollidersRef}
          onPositionChange={setPlayerCoords}
          avatarModelPath={avatarModelPath}
        />
      </Canvas>

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
        onToggleCameraMode={toggleCameraMode}
      />

      <RunObjectivePanel />
      <ObjectiveManager playerCoords={playerCoords} />
      <ExtractionManager playerCoords={playerCoords} />
      <RunOutcomeManager />

      <RunOrchestrator />

      <NPCInteractionManager
        npcId="harbor_guide"
        npcPosition={npcPosition}
        playerCoords={playerCoords}
      />
      {objectiveTargets.map((target, index) => (
        <NPCInteractionManager
          key={target.id || `objective_npc_${index}`}
          npcId={`objective_${target.location || "target"}_${index}`}
          npcPosition={target.position}
          playerCoords={playerCoords}
        />
      ))}
    </div>
  );
}
