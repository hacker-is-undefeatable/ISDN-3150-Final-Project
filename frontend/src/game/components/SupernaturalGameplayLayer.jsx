import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { requestDirectorUpdate } from "../ai/directorApi";
import { requestDynamicEvent } from "../ai/eventApi";
import { requestInteractionDecision } from "../ai/interactionApi";
import { buildStoryObjective } from "../data/storyObjectives";
import { shouldIgnoreGameplayKey } from "../lib/inputGuards";
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
const PORT_GHOST_SHIP_POSITION = [76.51, 9.22, -39.34];
const PORT_AIRSHIP_POSITION = [68.8, 29.1, -104.4];

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
  if (Array.isArray(arguments[0])) {
    return { x, y, z };
  }
  const arg = arguments[0];
  if (arg && typeof arg === "object") {
    return { x: Number(arg.x) || 0, y: Number(arg.y) || 0, z: Number(arg.z) || 0 };
  }
  return { x: 0, y: 0, z: 0 };
}

function createSeededRandom(seed) {
  let state = Number.isFinite(seed) ? seed : Date.now();
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function jitterPosition([x, y, z], random, magnitude) {
  const dx = (random() * 2 - 1) * magnitude;
  const dz = (random() * 2 - 1) * magnitude;
  return [x + dx, y, z + dz];
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

function useRegisterCollider(ref, terrainCollidersRef) {
  useEffect(() => {
    const mesh = ref.current;
    const colliders = terrainCollidersRef?.current;
    if (!mesh || !colliders) return undefined;

    const currentWalls = Array.isArray(colliders.walls) ? colliders.walls : [];
    const currentAlwaysBlockNames = Array.isArray(colliders.alwaysBlockNames)
      ? colliders.alwaysBlockNames
      : [];

    if (!currentWalls.includes(mesh)) {
      colliders.walls = [...currentWalls, mesh];
    }

    const meshName = String(mesh.name || "").toLowerCase();
    if (meshName && !currentAlwaysBlockNames.includes(meshName)) {
      colliders.alwaysBlockNames = [...currentAlwaysBlockNames, meshName];
    }

    return () => {
      const nextWalls = (Array.isArray(colliders.walls) ? colliders.walls : []).filter((item) => item !== mesh);
      const nextBlockNames = (Array.isArray(colliders.alwaysBlockNames) ? colliders.alwaysBlockNames : []).filter(
        (name) => name !== meshName
      );
      colliders.walls = nextWalls;
      colliders.alwaysBlockNames = nextBlockNames;
    };
  }, [ref, terrainCollidersRef]);
}

export default function SupernaturalGameplayLayer({ playerCoords, onHudChange, terrainCollidersRef }) {
  const world = useWorldStore((state) => state.world);
  const patchWorld = useWorldStore((state) => state.patchWorld);
  const addActiveEvent = useWorldStore((state) => state.addActiveEvent);
  const setExtractionTarget = useWorldStore((state) => state.setExtractionTarget);

  const objectivePlan = useMemo(() => buildStoryObjective(world.runSeed || 0), [world.runSeed]);
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
  const [objectiveComplete, setObjectiveComplete] = useState(false);
  const [objectiveText, setObjectiveText] = useState("Speak to the guide for your first clue.");
  const [atmospherePulse, setAtmospherePulse] = useState(0);
  const [ritualIntensity, setRitualIntensity] = useState(0);
  const [particleBursts, setParticleBursts] = useState([]);
  const [nearestInteraction, setNearestInteraction] = useState(null);
  const ghostShipColliderFrontRef = useRef(null);
  const ghostShipColliderBackRef = useRef(null);
  const ghostShipColliderLeftRef = useRef(null);
  const ghostShipColliderRightRef = useRef(null);

  const recentEventsRef = useRef([]);
  const bootstrappedRef = useRef(false);
  const hasAudioGestureRef = useRef(false);
  const previousCoordsRef = useRef(playerCoords || { x: 0, y: 0, z: 0 });
  const burstIdRef = useRef(0);
  const forestAudioRef = useRef(null);
  const shoreAudioRef = useRef(null);
  const ritualAudioRef = useRef(null);
  const footstepAudioRef = useRef(null);
  const runSeed = Number(world.runSeed) || 0;

  useRegisterCollider(ghostShipColliderFrontRef, terrainCollidersRef);
  useRegisterCollider(ghostShipColliderBackRef, terrainCollidersRef);
  useRegisterCollider(ghostShipColliderLeftRef, terrainCollidersRef);
  useRegisterCollider(ghostShipColliderRightRef, terrainCollidersRef);

  const spawnPositions = useMemo(() => {
    const makeRandom = (salt) => createSeededRandom(runSeed + salt);

    return {
      ruins: jitterPosition([LOCATIONS.ruins.x, LOCATIONS.ruins.y, LOCATIONS.ruins.z], makeRandom(1), 1.1),
      cave: jitterPosition([LOCATIONS.cave.x, LOCATIONS.cave.y, LOCATIONS.cave.z], makeRandom(2), 0.9),
      port: jitterPosition([LOCATIONS.port.x, LOCATIONS.port.y, LOCATIONS.port.z], makeRandom(3), 1.5),
      shoreline: jitterPosition([LOCATIONS.shoreline.x, LOCATIONS.shoreline.y, LOCATIONS.shoreline.z], makeRandom(4), 1.2),
      bridge: jitterPosition([LOCATIONS.bridge.x, LOCATIONS.bridge.y, LOCATIONS.bridge.z], makeRandom(5), 1.4),
      forest: jitterPosition([LOCATIONS.forest.x, LOCATIONS.forest.y, LOCATIONS.forest.z], makeRandom(6), 1.1),
      candles: CANDLE_POSITIONS.map((position, index) => jitterPosition(position, makeRandom(20 + index), 0.7)),
      relics: (function () {
        try {
          if (objectivePlan && objectivePlan.type === "recover_relics" && Array.isArray(objectivePlan.positions) && objectivePlan.positions.length) {
            return objectivePlan.positions.map((position, index) => jitterPosition(position, makeRandom(40 + index), 0.7));
          }
        } catch (e) {
          // fall through to default
        }
        return RELIC_POSITIONS.map((position, index) => jitterPosition(position, makeRandom(40 + index), 0.7));
      })(),
      totem: jitterPosition(FOREST_TOTEM_POSITION, makeRandom(60), 0.9),
      skull: jitterPosition(FOREST_SKULL_POSITION, makeRandom(61), 0.7),
      lantern: jitterPosition(FOREST_LANTERN_POSITION, makeRandom(62), 0.8),
      tablet: jitterPosition(TABLET_POSITION, makeRandom(63), 0.8),
      chest: jitterPosition(CHEST_POSITION, makeRandom(64), 1.0),
      swordStone: jitterPosition(SWORD_STONE_POSITION, makeRandom(65), 1.0),
      portGhostShip: jitterPosition(PORT_GHOST_SHIP_POSITION, makeRandom(66), 1.5),
      portAirship: jitterPosition(PORT_AIRSHIP_POSITION, makeRandom(67), 1.8)
    };
  }, [runSeed, objectivePlan]);

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
        extractionReady: Boolean(world.extractionTarget),
        directionHint: world.directionHint || null
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
    if (bootstrappedRef.current || !world.storyObjective) return;
    bootstrappedRef.current = true;

    patchWorld({ weather: "cloudy", corruption: 0, dangerLevel: 0, ritualIntensity: 0, supernaturalPulse: 0 });
    setObjectiveText(world.storyObjective.hint || objectivePlan.hint || "Speak to the guide for your first clue.");

    requestDirectorUpdate(world, [], [])
      .then((director) => {
        patchWorld({
          weather: mapWeatherId(director?.weather),
          corruption: Math.max(0, (world.corruption || 0) + (director?.adjustments?.corruptionDelta || 0)),
          dangerLevel: Math.max(0, (world.dangerLevel || 0) + (director?.adjustments?.dangerDelta || 0))
        });
        if (director?.nextEvent?.spawnEvent) {
          addActiveEvent({ id: director.nextEvent.spawnEvent, location: director.nextEvent.location || "ruins", startedAt: new Date().toISOString() });
        }
      })
      .catch(() => {});
  }, [addActiveEvent, objectivePlan.hint, patchWorld, world, world.storyObjective]);

  useFrame((_, delta) => {
    setParticleBursts((prev) => {
      if (!prev.length) return prev;

      const next = [];
      for (const item of prev) {
        const age = item.age + delta;
        if (age < 1.1) {
          next.push({ ...item, age });
        }
      }

      return next;
    });

    setAtmospherePulse((prev) => {
      if (prev <= 0) return prev;
      const next = Math.max(0, prev - delta * 0.4);
      return next === prev ? prev : next;
    });

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

    if (objectiveComplete) {
      return list;
    }

    if (objectivePlan.type === "repair_lantern") {
      if (!lanternRepaired && objectivePlan.positions[0]) {
        list.push({
          id: "repair_lantern",
          prompt: "Press E to repair lantern",
          position: clonePosition(objectivePlan.positions[0]),
          radius: 2.8
        });
      }
      return list;
    }

    if (objectivePlan.type === "light_candles") {
      objectivePlan.positions.forEach((position, candleIndex) => {
        if (!litCandles[candleIndex]) {
          list.push({ id: `candle_${candleIndex}`, prompt: "Press E to light candle", position: clonePosition(position), radius: 2.4 });
        }
      });
      return list;
    }

    if (objectivePlan.type === "recover_relics") {
      objectivePlan.positions.forEach((position, relicIndex) => {
        if (!collectedRelics[relicIndex]) {
          list.push({ id: `relic_${relicIndex}`, prompt: "Press E to recover relic fragment", position: clonePosition(position), radius: 2.4 });
        }
      });
    }

    return list;
  }, [collectedRelics, lanternRepaired, litCandles, objectiveComplete, objectivePlan.positions, objectivePlan.type]);

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

    if (objectivePlan.type === "repair_lantern" && nearestInteraction.id === "repair_lantern") {
      setLanternRepaired(true);
      setObjectiveComplete(true);
      setAtmospherePulse((prev) => Math.min(2, prev + 0.35));
      setObjectiveText(`The lantern is repaired in the ${objectivePlan.locationLabel}. Speak to the guide to learn your escape.`);
      spawnBurst(objectivePlan.positions[0], "#fce8a5");
      patchWorld({
        awaitingNpcGuidance: true,
        extractionOptions: [
          { id: "ghost_ship", label: "Ghost Ship", location: "port", position: { x: spawnPositions.portGhostShip[0], y: spawnPositions.portGhostShip[1], z: spawnPositions.portGhostShip[2] } },
          { id: "port", label: "Port", location: "port", position: { x: spawnPositions.port[0], y: spawnPositions.port[1], z: spawnPositions.port[2] } }
        ]
      });
      return;
    }

    if (objectivePlan.type === "light_candles" && nearestInteraction.id.startsWith("candle_")) {
      const candleIndex = Number(nearestInteraction.id.replace("candle_", ""));
      const nextLit = [...litCandles];
      nextLit[candleIndex] = true;
      setLitCandles(nextLit);
      spawnBurst(objectivePlan.positions[candleIndex], "#ffbf78");

      if (nextLit.every(Boolean)) {
        setObjectiveComplete(true);
        setAtmospherePulse((prev) => Math.min(2, prev + 0.5));
        setObjectiveText(`The candle ritual is complete in the ${objectivePlan.locationLabel}. Speak to the guide to learn your escape.`);
        patchWorld({
          corruption: Math.max(0, (world.corruption || 0) - 2),
          ritualIntensity: Math.min(2, (world.ritualIntensity || 0) + 0.2),
          weather: "mist",
          awaitingNpcGuidance: true,
          extractionOptions: [
            { id: "ghost_ship", label: "Ghost Ship", location: "port", position: { x: spawnPositions.portGhostShip[0], y: spawnPositions.portGhostShip[1], z: spawnPositions.portGhostShip[2] } },
            { id: "port", label: "Port", location: "port", position: { x: spawnPositions.port[0], y: spawnPositions.port[1], z: spawnPositions.port[2] } }
          ]
        });
      }
      return;
    }

    if (objectivePlan.type === "recover_relics" && nearestInteraction.id.startsWith("relic_")) {
      const relicIndex = Number(nearestInteraction.id.replace("relic_", ""));
      const next = [...collectedRelics];
      next[relicIndex] = true;
      setCollectedRelics(next);
      spawnBurst(objectivePlan.positions[relicIndex], "#9fe8ff");

      if (next.every(Boolean)) {
        setObjectiveComplete(true);
        setAtmospherePulse((prev) => Math.min(2, prev + 0.4));
        setObjectiveText(`The relics have been recovered from the ${objectivePlan.locationLabel}. Speak to the guide to learn your escape.`);
        patchWorld({
          corruption: Math.max(0, (world.corruption || 0) - 1),
          awaitingNpcGuidance: true,
          extractionOptions: [
            { id: "ghost_ship", label: "Ghost Ship", location: "port", position: { x: spawnPositions.portGhostShip[0], y: spawnPositions.portGhostShip[1], z: spawnPositions.portGhostShip[2] } },
            { id: "port", label: "Port", location: "port", position: { x: spawnPositions.port[0], y: spawnPositions.port[1], z: spawnPositions.port[2] } }
          ]
        });
      }
      return;
    }

    if (nearestInteraction.id.startsWith("candle_")) {
      const candleIndex = Number(nearestInteraction.id.replace("candle_", ""));
      const expected = CANDLE_SEQUENCE[inputSequence.length];
      spawnBurst(spawnPositions.candles[candleIndex], "#ffbf78");

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
      spawnBurst(spawnPositions.relics[relicIndex], "#9fe8ff");
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
      spawnBurst(spawnPositions.tablet, "#c0b7ff");

      await callBackendInteraction(
        { type: "tablet_inspection", action: "inspect_tablet", state: {} },
        { result: "success", corruptionDelta: -2, supernaturalDelta: 1, weather: "mist", atmosphere: { pulse: 0.45, ritualDelta: 0.1, particleBurst: true }, objectiveText: "Pull the sword at the bridge to trigger extraction." }
      );
      return;
    }

    if (nearestInteraction.id === "open_chest") {
      setChestOpened(true);
      setObjectiveText("Port cache opened. Supplies secured for extraction.");
      spawnBurst(spawnPositions.chest, "#ffd7aa");

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
      spawnBurst(spawnPositions.swordStone, "#f4f4ff");

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
    objectiveComplete,
    objectivePlan.locationLabel,
    objectivePlan.positions,
    objectivePlan.type,
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
      if (shouldIgnoreGameplayKey(event)) return;
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
        {objectivePlan.type === "light_candles" && objectivePlan.positions.map((position, index) => (
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

        {objectivePlan.type === "light_candles" && objectiveComplete && objectivePlan.positions[0] && (
          <pointLight position={[objectivePlan.positions[0][0], objectivePlan.positions[0][1] + 1.7, objectivePlan.positions[0][2]]} intensity={2.2 + atmospherePulse * 0.6} distance={11} color="#d7b4ff" />
        )}
      </group>

      <group>
        {objectivePlan.type === "repair_lantern" && objectivePlan.positions[0] && (
          !lanternRepaired ? (
            <>
              <WorldModel path={MODELS.brokenLantern} position={objectivePlan.positions[0]} scale={1.25} fitSize={1.3} />
              <pointLight position={[objectivePlan.positions[0][0], objectivePlan.positions[0][1] + 0.45, objectivePlan.positions[0][2]]} intensity={0.3} distance={2.5} color="#8d7f63" />
            </>
          ) : (
            <>
              <WorldModel path={MODELS.repairedLantern} position={objectivePlan.positions[0]} scale={1.25} fitSize={1.3} />
              <pointLight position={[objectivePlan.positions[0][0], objectivePlan.positions[0][1] + 1.1, objectivePlan.positions[0][2]]} intensity={2.3} distance={8.5} color="#ffe39d" />
            </>
          )
        )}

        {objectivePlan.type === "recover_relics" && objectivePlan.positions.map((position, index) => {
          const relicModels = [MODELS.relic1, MODELS.relic2, MODELS.relic3, MODELS.relic4];
          return !collectedRelics[index] ? <WorldModel key={`relic_${index}`} path={relicModels[index]} position={position} scale={0.95} fitSize={0.55} /> : null;
        })}
      </group>

      <group>
        {!swordPulled ? (
          <WorldModel path={MODELS.swordStone} position={spawnPositions.swordStone} scale={1.2} fitSize={2.7} />
        ) : (
          <>
            <WorldModel path={MODELS.stoneNoSword} position={spawnPositions.swordStone} scale={1.2} fitSize={2.7} />
            <WorldModel path={MODELS.sword} position={[spawnPositions.swordStone[0] + 1.6, spawnPositions.swordStone[1] + 0.24, spawnPositions.swordStone[2] - 0.7]} rotation={[0, 0.35, 1.1]} scale={1.2} fitSize={1.8} />
            <pointLight position={[spawnPositions.swordStone[0], spawnPositions.swordStone[1] + 2.1, spawnPositions.swordStone[2]]} intensity={2.4 + atmospherePulse * 0.8} distance={13} color="#e9ebff" />
          </>
        )}
      </group>

      <group>
        <WorldModel path={MODELS.stoneTablet} position={spawnPositions.tablet} rotation={[0, 0.2, 0]} scale={1.05} fitSize={1.8} visible={hiddenClueVisible || tabletInspected} />
        <WorldModel path={MODELS.statueFragment} position={[spawnPositions.cave[0] + 2.1, spawnPositions.cave[1] + 0.1, spawnPositions.cave[2] + 0.8]} scale={1.0} fitSize={1.5} />
        <WorldModel path={MODELS.statueFace} position={[spawnPositions.cave[0] - 1.8, spawnPositions.cave[1] + 0.05, spawnPositions.cave[2] - 1.9]} rotation={[0, -0.6, 0]} scale={1.0} fitSize={1.5} />
        <WorldModel path={MODELS.skull} position={[spawnPositions.cave[0] + 1.2, spawnPositions.cave[1] + 0.05, spawnPositions.cave[2] - 2.8]} scale={1.0} fitSize={0.85} />
        {(hiddenClueVisible || tabletInspected) && <pointLight position={[spawnPositions.tablet[0], spawnPositions.tablet[1] + 1.2, spawnPositions.tablet[2]]} intensity={1.5} distance={7} color="#b4e0ff" />}
      </group>

      <group>
        <WorldModel path={MODELS.chest} position={spawnPositions.chest} scale={1.05} fitSize={1.8} />
        {chestOpened && <pointLight position={[spawnPositions.chest[0], spawnPositions.chest[1] + 0.8, spawnPositions.chest[2]]} intensity={1.45} distance={6} color="#ffd7aa" />}
        <WorldModel path={MODELS.ghostShip} position={spawnPositions.portGhostShip} rotation={[0, 0.75, 0]} scale={2.9} fitSize={7.5} />
        <group position={spawnPositions.portGhostShip} rotation={[0, 0.75, 0]}>
          <mesh ref={ghostShipColliderFrontRef} name="rocks_pack">
            <boxGeometry args={[12, 10, 1.4]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh ref={ghostShipColliderBackRef} name="rocks_pack">
            <boxGeometry args={[12, 10, 1.4]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh ref={ghostShipColliderLeftRef} name="rocks_pack">
            <boxGeometry args={[1.4, 10, 22]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh ref={ghostShipColliderRightRef} name="rocks_pack">
            <boxGeometry args={[1.4, 10, 22]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
        <WorldModel path={MODELS.airship} position={spawnPositions.portAirship} rotation={[0, -0.8, 0]} scale={2.6} fitSize={6.5} />
      </group>

      <group>
        <WorldModel path={MODELS.statueFragment} position={[spawnPositions.shoreline[0] - 2.2, spawnPositions.shoreline[1] + 0.05, spawnPositions.shoreline[2] + 2.4]} scale={0.85} fitSize={1.4} />
        <WorldModel path={MODELS.statueFace} position={[spawnPositions.shoreline[0] - 4.0, spawnPositions.shoreline[1] + 0.2, spawnPositions.shoreline[2] + 1.8]} rotation={[0, 1.2, 0]} scale={0.95} fitSize={1.4} />
        <WorldModel path={MODELS.woodenTotem} position={[spawnPositions.shoreline[0] + 1.1, spawnPositions.shoreline[1] + 0.1, spawnPositions.shoreline[2] + 3.2]} rotation={[0, 0.5, 0]} scale={0.95} fitSize={1.8} />
        <WorldModel path={MODELS.skull} position={[spawnPositions.shoreline[0] + 2.4, spawnPositions.shoreline[1] + 0.1, spawnPositions.shoreline[2] + 2.2]} scale={1.0} fitSize={0.9} />
        {totemCleansed && <pointLight position={[spawnPositions.totem[0], spawnPositions.totem[1] + 1.6, spawnPositions.totem[2]]} intensity={1.6} distance={8} color="#8ef0af" />}
      </group>

      {ritualFailFlash && <pointLight position={[spawnPositions.ruins[0], spawnPositions.ruins[1] + 1.3, spawnPositions.ruins[2]]} intensity={3.2} distance={11} color="#8c6fff" />}

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