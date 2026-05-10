import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { requestDirectorUpdate } from "../ai/directorApi";
import { requestDynamicEvent } from "../ai/eventApi";
import { requestInteractionDecision } from "../ai/interactionApi";
import { useWorldStore } from "../state/worldStore";

const MODEL_ROOT = "/model/3d_asset";
const MODELS = {
  altar: `${MODEL_ROOT}/altar.glb`,
  brokenLantern: `${MODEL_ROOT}/broken_lantern.glb`,
  candlesOff: `${MODEL_ROOT}/candles_off.glb`,
  candlesOn: `${MODEL_ROOT}/candles_on.glb`,
  chest: `${MODEL_ROOT}/chest.glb`,
  ghostShip: `${MODEL_ROOT}/ghost_ship.glb`,
  repairedLantern: `${MODEL_ROOT}/repaired_lantern.glb`,
  relic1: `${MODEL_ROOT}/relics_01.glb`,
  relic2: `${MODEL_ROOT}/relics_02.glb`,
  relic3: `${MODEL_ROOT}/relics_03.glb`,
  relic4: `${MODEL_ROOT}/relics_04.glb`,
  ritualCircle: `${MODEL_ROOT}/ritual_circle.glb`,
  skull: `${MODEL_ROOT}/skull.glb`,
  statueFace: `${MODEL_ROOT}/statue_face.glb`,
  statueFragment: `${MODEL_ROOT}/statue_fragment_of_amenhotep_iii.glb`,
  stoneTablet: `${MODEL_ROOT}/stone_tablet.glb`,
  stoneNoSword: `${MODEL_ROOT}/stone_without_a_sword.glb`,
  sword: `${MODEL_ROOT}/sword.glb`,
  swordStone: `${MODEL_ROOT}/the_sword_with_the_stone.glb`,
  woodenTotem: `${MODEL_ROOT}/wooden_totem.glb`,
  airship: `${MODEL_ROOT}/airship.glb`
};

const LOCATIONS = {
  ruins: { x: -25.8, y: 24.05, z: 18.4 },
  cave: { x: -2.2, y: 11.25, z: 10.6 },
  port: { x: 60.1, y: 12.2, z: -89.7 },
  shoreline: { x: 67.8, y: 10.1, z: -42.0 },
  bridge: { x: 40.4, y: 23.05, z: 6.2 },
  forest: { x: -25.2, y: 26.0, z: -18.6 }
};

const CANDLE_SEQUENCE = [0, 2, 3, 1];
const CANDLE_POSITIONS = [
  [-27.4, 24.15, 17.1],
  [-23.9, 24.15, 16.7],
  [-24.2, 24.15, 20.9],
  [-27.3, 24.15, 20.7]
];
const RELIC_POSITIONS = [
  [-27.5, 26.05, -18.3],
  [-24.2, 26.1, -19.7],
  [-24.6, 26.0, -16.4],
  [-27.9, 26.05, -16.8]
];

const FOREST_TOTEM_POSITION = [-24.1, 26.05, -22.2];
const FOREST_SKULL_POSITION = [-22.8, 26.1, -20.7];
const FOREST_LANTERN_POSITION = [-27.1, 26.05, -18.9];
const TABLET_POSITION = [-2.7, 11.3, 9.5];
const CHEST_POSITION = [59.4, 12.2, -90.8];
const SWORD_STONE_POSITION = [40.8, 23.1, 6.8];
const PORT_GHOST_SHIP_POSITION = [66.8, 10.2, -46.8];
const PORT_AIRSHIP_POSITION = [68.8, 29.1, -104.4];
const SHORE_GHOST_SHIP_POSITION = [63.8, 10.4, -38.8];

function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function mapWeatherId(rawWeather) {
  const value = String(rawWeather || "").toLowerCase();
  if (value.includes("mist")) return "mist";
  if (value.includes("night") || value.includes("corruption") || value.includes("blood")) return "night";
  return "cloudy";
}

function clonePosition([x, y, z]) {
  return { x, y, z };
}

function WorldModel({ path, position, rotation = [0, 0, 0], scale = 1, visible = true, fitSize = null }) {
  const gltf = useGLTF(path);
  const clone = useMemo(() => {
    if (!gltf || !gltf.scene) {
      console.warn(`[WorldModel] Invalid GLTF for ${path}`);
      return null;
    }
    return gltf.scene.clone(true);
  }, [gltf, path]);

  if (!clone) return null;

  const fittedScale = useMemo(() => {
    const baseScale = Array.isArray(scale) ? scale : [scale, scale, scale];
    if (!fitSize) return baseScale;

    const bounds = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const factor = fitSize / maxDim;

    return baseScale.map((value) => value * factor);
  }, [clone, fitSize, scale]);

  return (
    <primitive
      object={clone}
      visible={visible}
      position={position}
      rotation={rotation}
      scale={fittedScale}
    />
  );
}

function PulseBurst({ burst }) {
  const ref = useRef(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.scale.multiplyScalar(1 + delta * 1.4);
    ref.current.material.opacity = Math.max(0, ref.current.material.opacity - delta * 1.6);
  });

  return (
    <mesh ref={ref} position={burst.position}>
      <sphereGeometry args={[0.14, 10, 10]} />
      <meshBasicMaterial color={burst.color} transparent opacity={0.75} />
    </mesh>
  );
}

export default function SupernaturalGameplayLayer({ playerCoords, onHudChange }) {
  const world = useWorldStore((state) => state.world);
  const patchWorld = useWorldStore((state) => state.patchWorld);
  const addActiveEvent = useWorldStore((state) => state.addActiveEvent);
  const setExtractionTarget = useWorldStore((state) => state.setExtractionTarget);

  const [litCandles, setLitCandles] = useState([false, false, false, false]);
  const [inputSequence, setInputSequence] = useState([]);
  const [ritualCompleted, setRitualCompleted] = useState(false);
  const [ritualFailFlash, setRitualFailFlash] = useState(false);
  const [collectedRelics, setCollectedRelics] = useState([false, false, false, false]);
  const [lanternRepaired, setLanternRepaired] = useState(false);
  const [swordPulled, setSwordPulled] = useState(false);
  const [tabletInspected, setTabletInspected] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  const [totemCleansed, setTotemCleansed] = useState(false);
  const [hiddenClueVisible, setHiddenClueVisible] = useState(false);
  const [objectiveText, setObjectiveText] = useState("Light the ritual candles in the Ruins.");
  const [atmospherePulse, setAtmospherePulse] = useState(0);
  const [ritualIntensity, setRitualIntensity] = useState(0);
  const [particleBursts, setParticleBursts] = useState([]);
  const [nearestInteraction, setNearestInteraction] = useState(null);

  const recentEventsRef = useRef([]);
  const bootstrappedRef = useRef(false);
  const hasAudioGestureRef = useRef(false);
  const previousCoordsRef = useRef(playerCoords || { x: 0, y: 0, z: 0 });
  const burstIdRef = useRef(0);
  const forestAudioRef = useRef(null);
  const shoreAudioRef = useRef(null);
  const ritualAudioRef = useRef(null);
  const footstepAudioRef = useRef(null);

  const spawnBurst = useCallback((position, color = "#ffd27d") => {
    burstIdRef.current += 1;
    setParticleBursts((prev) => [...prev, { id: burstIdRef.current, position, color, age: 0 }]);
  }, []);

  useEffect(() => {
    if (typeof onHudChange === "function") {
      onHudChange({
        objectiveText,
        corruption: world.corruption,
        weather: world.weather,
        ritualIntensity,
        extractionReady: Boolean(world.extractionTarget)
      });
    }
  }, [objectiveText, onHudChange, ritualIntensity, world.corruption, world.extractionTarget, world.weather]);

  useEffect(() => {
    const forest = new Audio("/sound/forest.wav");
    forest.loop = true;
    forest.volume = 0.22;

    const shore = new Audio("/sound/seashore.wav");
    shore.loop = true;
    shore.volume = 0.18;

    const ritual = new Audio("/sound/ritual.wav");
    ritual.loop = true;
    ritual.volume = 0.08;

    const footsteps = new Audio("/sound/footstep.wav");
    footsteps.loop = true;
    footsteps.volume = 0.1;

    forestAudioRef.current = forest;
    shoreAudioRef.current = shore;
    ritualAudioRef.current = ritual;
    footstepAudioRef.current = footsteps;

    return () => {
      [forest, shore, ritual, footsteps].forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  const startAmbientAudio = useCallback(() => {
    if (hasAudioGestureRef.current) return;
    hasAudioGestureRef.current = true;
    forestAudioRef.current?.play().catch(() => {});
    shoreAudioRef.current?.play().catch(() => {});
    ritualAudioRef.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    patchWorld({ weather: "cloudy", corruption: 0, dangerLevel: 0, ritualIntensity: 0, supernaturalPulse: 0 });

    requestDirectorUpdate(world, [], [])
      .then((director) => {
        patchWorld({
          weather: mapWeatherId(director?.weather),
          corruption: Math.max(0, (world.corruption || 0) + (director?.adjustments?.corruptionDelta || 0)),
          dangerLevel: Math.max(0, (world.dangerLevel || 0) + (director?.adjustments?.dangerDelta || 0))
        });
        if (director?.objective?.description) setObjectiveText(director.objective.description);
        if (director?.nextEvent?.spawnEvent) {
          addActiveEvent({ id: director.nextEvent.spawnEvent, location: director.nextEvent.location || "ruins", startedAt: new Date().toISOString() });
        }
      })
      .catch(() => {});
  }, [addActiveEvent, patchWorld, world]);

  useFrame((_, delta) => {
    setParticleBursts((prev) => prev.map((item) => ({ ...item, age: item.age + delta })).filter((item) => item.age < 1.1));
    setAtmospherePulse((prev) => Math.max(0, prev - delta * 0.4));

    if (!hasAudioGestureRef.current || !playerCoords) return;
    const moved = distance3D(previousCoordsRef.current, playerCoords);
    previousCoordsRef.current = { ...playerCoords };
    const foot = footstepAudioRef.current;
    if (!foot) return;
    if (moved > 0.02) foot.play().catch(() => {});
    else foot.pause();
  });

  const applyBackendDecision = useCallback(
    (decision) => {
      if (!decision) return;

      const corruptionDelta = Number(decision.corruptionDelta) || 0;
      const supernaturalDelta = Number(decision.supernaturalDelta) || 0;

      patchWorld({
        weather: mapWeatherId(decision.weather || world.weather),
        corruption: Math.max(0, (world.corruption || 0) + corruptionDelta),
        dangerLevel: Math.max(0, (world.dangerLevel || 0) + supernaturalDelta),
        supernaturalPulse: Math.min(2, Number(decision.atmosphere?.pulse) || 0),
        ritualIntensity: Math.min(2, Math.max(0, ritualIntensity + (Number(decision.atmosphere?.ritualDelta) || 0)))
      });

      if (decision.objectiveText) setObjectiveText(decision.objectiveText);
      if (decision.nextEvent) {
        addActiveEvent({ id: decision.nextEvent, location: decision.location || "ruins", startedAt: new Date().toISOString() });
      }
      if (decision.extractionUnlocked) {
        setExtractionTarget({
          id: "extraction_port",
          location: "port",
          position: { x: LOCATIONS.port.x + 3.2, y: LOCATIONS.port.y, z: LOCATIONS.port.z - 2.5 }
        });
      }
      if (decision.atmosphere?.audioRitualBoost) ritualAudioRef.current?.play().catch(() => {});
      if (decision.atmosphere?.particleBurst) setAtmospherePulse((prev) => Math.min(2, prev + 0.5));
    },
    [addActiveEvent, patchWorld, ritualIntensity, setExtractionTarget, world.corruption, world.dangerLevel, world.weather]
  );

  const pushRecentEvent = useCallback((event) => {
    recentEventsRef.current = [...recentEventsRef.current.slice(-8), event];
  }, []);

  const callBackendInteraction = useCallback(
    async (payload, fallbackDecision) => {
      try {
        const response = await requestInteractionDecision({ worldState: world, recentEvents: recentEventsRef.current, ...payload });
        applyBackendDecision(response);
        pushRecentEvent({ type: payload.type, action: payload.action, result: response.result, timestamp: new Date().toISOString() });
      } catch {
        applyBackendDecision(fallbackDecision);
        pushRecentEvent({ type: payload.type, action: payload.action, result: "fallback", timestamp: new Date().toISOString() });
      }
    },
    [applyBackendDecision, pushRecentEvent, world]
  );

  const interactions = useMemo(() => {
    const list = [];

    CANDLE_POSITIONS.forEach((position, candleIndex) => {
      if (!litCandles[candleIndex]) {
        list.push({ id: `candle_${candleIndex}`, prompt: "Press E to light candle", position: clonePosition(position), radius: 2.4 });
      }
    });

    RELIC_POSITIONS.forEach((position, relicIndex) => {
      if (!collectedRelics[relicIndex]) {
        list.push({ id: `relic_${relicIndex}`, prompt: "Press E to recover relic fragment", position: clonePosition(position), radius: 2.4 });
      }
    });

    if (collectedRelics.every(Boolean) && !lanternRepaired) {
      list.push({ id: "repair_lantern", prompt: "Press E to repair lantern", position: clonePosition(FOREST_LANTERN_POSITION), radius: 2.8 });
    }

    if (!swordPulled && ritualCompleted && lanternRepaired) {
      list.push({ id: "pull_sword", prompt: "Press E to pull sword", position: clonePosition(SWORD_STONE_POSITION), radius: 3.0 });
    }

    if (!tabletInspected && hiddenClueVisible) {
      list.push({ id: "inspect_tablet", prompt: "Press E to inspect tablet", position: clonePosition(TABLET_POSITION), radius: 2.8 });
    }

    if (!chestOpened) {
      list.push({ id: "open_chest", prompt: "Press E to open chest", position: clonePosition(CHEST_POSITION), radius: 2.9 });
    }

    if (!totemCleansed) {
      list.push({ id: "cleanse_totem", prompt: "Press E to cleanse totem", position: clonePosition(FOREST_TOTEM_POSITION), radius: 2.8 });
    }

    return list;
  }, [chestOpened, collectedRelics, hiddenClueVisible, lanternRepaired, litCandles, ritualCompleted, swordPulled, tabletInspected, totemCleansed]);

  useEffect(() => {
    if (!playerCoords || !interactions.length) {
      setNearestInteraction(null);
      return;
    }

    let nearest = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    interactions.forEach((entry) => {
      const dist = distance3D(playerCoords, entry.position);
      if (dist <= entry.radius && dist < bestDistance) {
        bestDistance = dist;
        nearest = entry;
      }
    });

    setNearestInteraction(nearest);
  }, [interactions, playerCoords]);

  const handleInteraction = useCallback(async () => {
    if (!nearestInteraction) return;
    startAmbientAudio();

    if (nearestInteraction.id.startsWith("candle_")) {
      const candleIndex = Number(nearestInteraction.id.replace("candle_", ""));
      const expected = CANDLE_SEQUENCE[inputSequence.length];
      spawnBurst(CANDLE_POSITIONS[candleIndex], "#ffbf78");

      if (expected === candleIndex) {
        const nextLit = [...litCandles];
        nextLit[candleIndex] = true;
        const nextSequence = [...inputSequence, candleIndex];
        setLitCandles(nextLit);
        setInputSequence(nextSequence);

        await callBackendInteraction(
          { type: "candle_ritual", action: "light_candle", state: { sequence: nextSequence, candleIndex } },
          { result: "progress", corruptionDelta: -1, supernaturalDelta: 1, weather: "mist", atmosphere: { pulse: 0.35, ritualDelta: 0.25, audioRitualBoost: true, particleBurst: true }, objectiveText: "Complete the ritual circle and stabilize the ruins." }
        );

        setAtmospherePulse((prev) => Math.min(2, prev + 0.35));
        setRitualIntensity((prev) => Math.min(2, prev + 0.2));

        if (nextSequence.length === CANDLE_SEQUENCE.length) {
          setRitualCompleted(true);
          setObjectiveText("Find relics at the Forest Path to repair the lantern.");
          requestDynamicEvent(world, recentEventsRef.current, ["ritual_circle_activated", "fog_tension_shift", "spirits_awaken"]).then((eventData) => {
            addActiveEvent({ id: eventData.spawnEvent, location: "ruins", startedAt: new Date().toISOString() });
            setAtmospherePulse((prev) => Math.min(2, prev + 0.6));
            patchWorld({ weather: "mist", corruption: Math.max(0, (world.corruption || 0) - 4) });
          }).catch(() => {
            patchWorld({ weather: "mist", corruption: Math.max(0, (world.corruption || 0) - 4) });
          });
        }
      } else {
        setLitCandles([false, false, false, false]);
        setInputSequence([]);
        setRitualCompleted(false);
        setRitualFailFlash(true);
        window.setTimeout(() => setRitualFailFlash(false), 850);
        setAtmospherePulse((prev) => Math.min(2, prev + 1));
        setRitualIntensity((prev) => Math.min(2, prev + 0.45));

        await callBackendInteraction(
          { type: "candle_ritual", action: "wrong_candle_sequence", state: { sequence: [...inputSequence, candleIndex], candleIndex } },
          { result: "fail", corruptionDelta: 7, supernaturalDelta: 2, weather: "night", atmosphere: { pulse: 1, ritualDelta: 0.5, audioRitualBoost: true, particleBurst: true }, objectiveText: "The ritual failed. Re-light candles in the correct order." }
        );
      }

      return;
    }

    if (nearestInteraction.id.startsWith("relic_")) {
      const relicIndex = Number(nearestInteraction.id.replace("relic_", ""));
      const next = [...collectedRelics];
      next[relicIndex] = true;
      setCollectedRelics(next);
      spawnBurst(RELIC_POSITIONS[relicIndex], "#9fe8ff");
      setObjectiveText(`Relic fragments recovered: ${next.filter(Boolean).length}/4`);
      return;
    }

    if (nearestInteraction.id === "repair_lantern") {
      setLanternRepaired(true);
      setHiddenClueVisible(true);
      setAtmospherePulse((prev) => Math.min(2, prev + 0.35));
      setObjectiveText("Lantern restored. Follow its glow to inspect the cave tablet.");
      spawnBurst(FOREST_LANTERN_POSITION, "#fce8a5");

      await callBackendInteraction(
        { type: "lantern_repair", action: "repair_lantern", state: { relics: 4 } },
        { result: "success", corruptionDelta: -5, supernaturalDelta: 1, weather: "cloudy", atmosphere: { pulse: 0.35, ritualDelta: -0.2, particleBurst: true }, objectiveText: "Inspect the awakened tablet in the cave." }
      );
      return;
    }

    if (nearestInteraction.id === "inspect_tablet") {
      setTabletInspected(true);
      setObjectiveText("Bridge resonance detected. Pull the sword from the stone.");
      setAtmospherePulse((prev) => Math.min(2, prev + 0.4));
      spawnBurst(TABLET_POSITION, "#c0b7ff");

      await callBackendInteraction(
        { type: "tablet_inspection", action: "inspect_tablet", state: {} },
        { result: "success", corruptionDelta: -2, supernaturalDelta: 1, weather: "mist", atmosphere: { pulse: 0.45, ritualDelta: 0.1, particleBurst: true }, objectiveText: "Pull the sword at the bridge to trigger extraction." }
      );
      return;
    }

    if (nearestInteraction.id === "open_chest") {
      setChestOpened(true);
      setObjectiveText("Port cache opened. Supplies secured for extraction.");
      spawnBurst(CHEST_POSITION, "#ffd7aa");

      await callBackendInteraction(
        { type: "port_cache", action: "open_chest", state: {} },
        { result: "success", corruptionDelta: -1, supernaturalDelta: 0, weather: world.weather, atmosphere: { pulse: 0.2, particleBurst: true } }
      );
      return;
    }

    if (nearestInteraction.id === "cleanse_totem") {
      setTotemCleansed(true);
      setAtmospherePulse((prev) => Math.min(2, prev + 0.25));
      spawnBurst(FOREST_TOTEM_POSITION, "#8ef0af");

      await callBackendInteraction(
        { type: "totem_cleansing", action: "cleanse_totem", state: {} },
        { result: "success", corruptionDelta: -3, supernaturalDelta: -1, weather: "cloudy", atmosphere: { pulse: 0.25, ritualDelta: -0.1, particleBurst: true } }
      );
      return;
    }

    if (nearestInteraction.id === "pull_sword") {
      setSwordPulled(true);
      setAtmospherePulse((prev) => Math.min(2, prev + 1.15));
      setObjectiveText("Sword pulled. Extraction now available at Port.");
      spawnBurst(SWORD_STONE_POSITION, "#f4f4ff");

      await callBackendInteraction(
        { type: "sword_event", action: "pull_sword", state: {} },
        { result: "success", corruptionDelta: 4, supernaturalDelta: 3, weather: "night", atmosphere: { pulse: 1.2, ritualDelta: 0.5, audioRitualBoost: true, particleBurst: true }, objectiveText: "Reach the Port for extraction.", extractionUnlocked: true, nextEvent: "extraction_window_open", location: "port" }
      );
    }
  }, [
    addActiveEvent,
    callBackendInteraction,
    collectedRelics,
    inputSequence,
    lanternRepaired,
    litCandles,
    nearestInteraction,
    patchWorld,
    spawnBurst,
    startAmbientAudio,
    world
  ]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "e") return;
      if (!nearestInteraction) return;
      event.preventDefault();
      void handleInteraction();
    };

    const onPointerDown = () => startAmbientAudio();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [handleInteraction, nearestInteraction, startAmbientAudio]);

  return (
    <group>
      <group>
        <WorldModel path={MODELS.ritualCircle} position={[LOCATIONS.ruins.x, LOCATIONS.ruins.y, LOCATIONS.ruins.z]} scale={1.08} fitSize={4.0} />
        <WorldModel path={MODELS.altar} position={[LOCATIONS.ruins.x + 0.2, LOCATIONS.ruins.y + 0.02, LOCATIONS.ruins.z - 1.2]} scale={1.0} fitSize={2.4} />

        {CANDLE_POSITIONS.map((position, index) => (
          <group key={`candle_${index}`}>
            {litCandles[index] ? (
              <>
                <WorldModel path={MODELS.candlesOn} position={position} scale={1.6} fitSize={1.2} />
                <pointLight position={[position[0], position[1] + 0.8, position[2]]} intensity={1.6} distance={4.2} color="#ffbe7d" />
              </>
            ) : (
              <WorldModel path={MODELS.candlesOff} position={position} scale={1.6} fitSize={1.2} />
            )}
          </group>
        ))}

        {ritualCompleted && (
          <>
            <pointLight position={[LOCATIONS.ruins.x, LOCATIONS.ruins.y + 1.7, LOCATIONS.ruins.z]} intensity={2.2 + atmospherePulse * 0.6} distance={11} color="#d7b4ff" />
            <mesh position={[LOCATIONS.ruins.x, LOCATIONS.ruins.y + 0.08, LOCATIONS.ruins.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[2.3, 2.8, 64]} />
              <meshBasicMaterial color="#c79fff" transparent opacity={0.45 + atmospherePulse * 0.12} />
            </mesh>
          </>
        )}
      </group>

      <group>
        <WorldModel path={MODELS.woodenTotem} position={FOREST_TOTEM_POSITION} scale={1.0} fitSize={2.2} />
        <WorldModel path={MODELS.skull} position={FOREST_SKULL_POSITION} scale={1.05} fitSize={0.9} />
        {!lanternRepaired ? (
          <>
            <WorldModel path={MODELS.brokenLantern} position={FOREST_LANTERN_POSITION} scale={1.25} fitSize={1.3} />
            <pointLight position={[FOREST_LANTERN_POSITION[0], FOREST_LANTERN_POSITION[1] + 0.45, FOREST_LANTERN_POSITION[2]]} intensity={0.3} distance={2.5} color="#8d7f63" />
          </>
        ) : (
          <>
            <WorldModel path={MODELS.repairedLantern} position={FOREST_LANTERN_POSITION} scale={1.25} fitSize={1.3} />
            <pointLight position={[FOREST_LANTERN_POSITION[0], FOREST_LANTERN_POSITION[1] + 1.1, FOREST_LANTERN_POSITION[2]]} intensity={2.3} distance={8.5} color="#ffe39d" />
          </>
        )}

        {!collectedRelics[0] && <WorldModel path={MODELS.relic1} position={RELIC_POSITIONS[0]} scale={0.95} fitSize={0.55} />}
        {!collectedRelics[1] && <WorldModel path={MODELS.relic2} position={RELIC_POSITIONS[1]} scale={0.95} fitSize={0.55} />}
        {!collectedRelics[2] && <WorldModel path={MODELS.relic3} position={RELIC_POSITIONS[2]} scale={0.95} fitSize={0.55} />}
        {!collectedRelics[3] && <WorldModel path={MODELS.relic4} position={RELIC_POSITIONS[3]} scale={0.95} fitSize={0.55} />}
      </group>

      <group>
        {!swordPulled ? (
          <WorldModel path={MODELS.swordStone} position={SWORD_STONE_POSITION} scale={1.2} fitSize={2.7} />
        ) : (
          <>
            <WorldModel path={MODELS.stoneNoSword} position={SWORD_STONE_POSITION} scale={1.2} fitSize={2.7} />
            <WorldModel path={MODELS.sword} position={[SWORD_STONE_POSITION[0] + 1.6, SWORD_STONE_POSITION[1] + 0.24, SWORD_STONE_POSITION[2] - 0.7]} rotation={[0, 0.35, 1.1]} scale={1.2} fitSize={1.8} />
            <pointLight position={[SWORD_STONE_POSITION[0], SWORD_STONE_POSITION[1] + 2.1, SWORD_STONE_POSITION[2]]} intensity={2.4 + atmospherePulse * 0.8} distance={13} color="#e9ebff" />
          </>
        )}
      </group>

      <group>
        <WorldModel path={MODELS.stoneTablet} position={TABLET_POSITION} rotation={[0, 0.2, 0]} scale={1.05} fitSize={1.8} visible={hiddenClueVisible || tabletInspected} />
        <WorldModel path={MODELS.statueFragment} position={[LOCATIONS.cave.x + 2.1, LOCATIONS.cave.y + 0.1, LOCATIONS.cave.z + 0.8]} scale={1.0} fitSize={1.5} />
        <WorldModel path={MODELS.statueFace} position={[LOCATIONS.cave.x - 1.8, LOCATIONS.cave.y + 0.05, LOCATIONS.cave.z - 1.9]} rotation={[0, -0.6, 0]} scale={1.0} fitSize={1.5} />
        <WorldModel path={MODELS.skull} position={[LOCATIONS.cave.x + 1.2, LOCATIONS.cave.y + 0.05, LOCATIONS.cave.z - 2.8]} scale={1.0} fitSize={0.85} />
        {(hiddenClueVisible || tabletInspected) && <pointLight position={[TABLET_POSITION[0], TABLET_POSITION[1] + 1.2, TABLET_POSITION[2]]} intensity={1.5} distance={7} color="#b4e0ff" />}
      </group>

      <group>
        <WorldModel path={MODELS.chest} position={CHEST_POSITION} scale={1.05} fitSize={1.8} />
        {chestOpened && <pointLight position={[CHEST_POSITION[0], CHEST_POSITION[1] + 0.8, CHEST_POSITION[2]]} intensity={1.45} distance={6} color="#ffd7aa" />}
        <WorldModel path={MODELS.ghostShip} position={PORT_GHOST_SHIP_POSITION} rotation={[0, 0.75, 0]} scale={2.9} fitSize={7.5} />
        <WorldModel path={MODELS.airship} position={PORT_AIRSHIP_POSITION} rotation={[0, -0.8, 0]} scale={2.6} fitSize={6.5} />
      </group>

      <group>
        <WorldModel path={MODELS.statueFragment} position={[LOCATIONS.shoreline.x - 2.2, LOCATIONS.shoreline.y + 0.05, LOCATIONS.shoreline.z + 2.4]} scale={0.85} fitSize={1.4} />
        <WorldModel path={MODELS.statueFace} position={[LOCATIONS.shoreline.x - 4.0, LOCATIONS.shoreline.y + 0.2, LOCATIONS.shoreline.z + 1.8]} rotation={[0, 1.2, 0]} scale={0.95} fitSize={1.4} />
        <WorldModel path={MODELS.woodenTotem} position={[LOCATIONS.shoreline.x + 1.1, LOCATIONS.shoreline.y + 0.1, LOCATIONS.shoreline.z + 3.2]} rotation={[0, 0.5, 0]} scale={0.95} fitSize={1.8} />
        <WorldModel path={MODELS.skull} position={[LOCATIONS.shoreline.x + 2.4, LOCATIONS.shoreline.y + 0.1, LOCATIONS.shoreline.z + 2.2]} scale={1.0} fitSize={0.9} />
        <WorldModel path={MODELS.ghostShip} position={SHORE_GHOST_SHIP_POSITION} rotation={[0, 0.7, 0]} scale={2.6} fitSize={6.8} />
        {totemCleansed && <pointLight position={[FOREST_TOTEM_POSITION[0], FOREST_TOTEM_POSITION[1] + 1.6, FOREST_TOTEM_POSITION[2]]} intensity={1.6} distance={8} color="#8ef0af" />}
      </group>

      {ritualFailFlash && <pointLight position={[LOCATIONS.ruins.x, LOCATIONS.ruins.y + 1.3, LOCATIONS.ruins.z]} intensity={3.2} distance={11} color="#8c6fff" />}

      {particleBursts.map((burst) => (
        <PulseBurst
          key={burst.id}
          burst={{
            ...burst,
            position: [burst.position[0], burst.position[1] + burst.age * 0.3, burst.position[2]]
          }}
        />
      ))}

      {nearestInteraction && (
        <Html position={[nearestInteraction.position.x, nearestInteraction.position.y + 1.6, nearestInteraction.position.z]} center distanceFactor={12} occlude>
          <div className="world-interaction-prompt">{nearestInteraction.prompt}</div>
        </Html>
      )}
    </group>
  );
}

Object.values(MODELS).forEach((path) => useGLTF.preload(path));