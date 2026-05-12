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
import NPCInteractionManager from "../game/components/NPCInteractionManager";

export default function GameScene({ avatarModelPath }) {
  const terrainCollidersRef = useRef({ ground: [], walls: [] });
  const canvasRef = useRef(null);
  const [npcPosition, setNpcPosition] = useState(() => ({ x: 0.9, y: 24.16, z: -3.17 }));
  const runSeed = useWorldStore((state) => state.world.runSeed);

  const GENSIN_MODELS = [
    "/model/genshin/model_arlec_v1.vrm",
    "/model/genshin/model_arlec_v2.vrm",
    "/model/genshin/model_charlotte.vrm",
    "/model/genshin/model_furina.vrm",
    "/model/genshin/model_ganyu.vrm",
    "/model/genshin/model_keqing.vrm",
    "/model/genshin/model_kokomi.vrm",
    "/model/genshin/model_nahida.vrm",
    "/model/genshin/model_navia.vrm",
    "/model/genshin/model_neuvi.vrm",
    "/model/genshin/model_skirk.vrm",
    "/model/genshin/model_xiangling.vrm",
    "/model/genshin/model_yelan.vrm",
    "/model/genshin/model_zhongli.vrm"
  ];

  const [npcModelPath, setNpcModelPath] = useState(null);

  function createSeededRandom(seed) {
    let state = Number.isFinite(seed) ? seed : Date.now();
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  useEffect(() => {
    if (!Array.isArray(GENSIN_MODELS) || !GENSIN_MODELS.length) return;
    if (Number.isFinite(Number(runSeed))) {
      const rand = createSeededRandom(Number(runSeed) + 7);
      const idx = Math.floor(rand() * GENSIN_MODELS.length);
      setNpcModelPath(GENSIN_MODELS[idx]);
    } else {
      setNpcModelPath(GENSIN_MODELS[Math.floor(Math.random() * GENSIN_MODELS.length)]);
    }
  }, [runSeed]);
  const [isContextLost, setIsContextLost] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const _ready = useRef({ terrain: false, avatar: false });

  const markReady = (key) => {
    _ready.current[key] = true;
    if (key === "terrain") setTerrainLoaded(true);
    if (key === "avatar") setAvatarLoaded(true);
    if ((_ready.current.terrain || key === "terrain") && (_ready.current.avatar || key === "avatar")) {
      setIsSceneReady(true);
    }
  };
  const [terrainProgress, setTerrainProgress] = useState(0);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [terrainLoaded, setTerrainLoaded] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const [cameraMode, setCameraMode] = useState("third-person");
  const [playerCoords, setPlayerCoords] = useState({ x: -6.25, y: 24.02, z: 3.92 });
  const extractionTarget = useWorldStore((state) => state.world.extractionTarget);
  const objectiveTargets = useWorldStore((state) => state.world.objectiveTargets || []);
  const extractionAvailable = useRunStore((state) => state.extractionAvailable);
  const [hudState, setHudState] = useState({
    objectiveText: "Speak to the guide for your first clue.",
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
        <Terrain
          collidersRef={terrainCollidersRef}
          onMapBoundsChange={setMapBounds}
          onProgress={(p) => setTerrainProgress(p)}
          onLoaded={() => markReady('terrain')}
        />
        <WeatherController />
        <AudioAtmosphere />
        <SupernaturalGameplayLayer
          playerCoords={playerCoords}
          onHudChange={setHudState}
          terrainCollidersRef={terrainCollidersRef}
        />
        <RunOrchestrator />
        {npcPosition && npcModelPath && (
          <group position={[npcPosition.x, npcPosition.y, npcPosition.z]}>
            <pointLight intensity={1.1} distance={8} color="#ffd166" />
            <NPCModel modelPath={npcModelPath} />
          </group>
        )}
        <PlayerRig
          mode={cameraMode}
          terrainCollidersRef={terrainCollidersRef}
          onPositionChange={setPlayerCoords}
          avatarModelPath={avatarModelPath}
          initialPosition={playerCoords}
          onLoaded={() => markReady('avatar')}
          onAvatarProgress={(p) => setAvatarProgress(p)}
          showAvatar={avatarLoaded}
        />
      </Canvas>

      {!isSceneReady && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <div className="loading-spinner" />
            <div>
              <div className="loading-text">Loading island…</div>
              <div style={{width:240,marginTop:8,height:8,background:'rgba(255,255,255,0.06)',borderRadius:6,overflow:'hidden'}}>
                <div style={{width: `${Math.round(((terrainProgress + avatarProgress)/2)*100)}%`,height:'100%',background:'#73d0ff',transition:'width 200ms linear'}} />
              </div>
              <div style={{marginTop:6,fontSize:12,color:'var(--muted)'}}>{Math.round(((terrainProgress + avatarProgress)/2)*100)}%</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .loading-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:60;background:linear-gradient(180deg,rgba(4,6,10,0.6),rgba(4,6,10,0.8))}
        .loading-card{background:var(--panel);border:1px solid var(--border);padding:18px 22px;border-radius:14px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow)}
        .loading-spinner{width:36px;height:36px;border-radius:50%;border:4px solid rgba(255,255,255,0.06);border-top-color:#73d0ff;animation:spin 1s linear infinite}
        .loading-text{font-weight:700;color:var(--text)}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <ObjectiveManager playerCoords={playerCoords} />
      <ExtractionManager playerCoords={playerCoords} />
      <NPCInteractionManager npcId="guide" npcPosition={npcPosition} playerCoords={playerCoords} />

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
