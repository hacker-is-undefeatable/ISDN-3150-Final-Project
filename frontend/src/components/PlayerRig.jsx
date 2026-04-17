import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

const SPEED = 3.2;
const AVATAR_YAW_OFFSET = 0;
const LOOK_SENSITIVITY = 0.005;
const MIN_PITCH = -0.85;
const MAX_PITCH = 0.75;
const WALK_CYCLE_FREQUENCY = 6;
const WALK_CYCLE_SPEED = 1.4;
const RAYCAST_HEIGHT = 60;
const FEET_HEIGHT_OFFSET = 0.02;
const CHARACTER_ROOT_OFFSET = 1.05;
const CAMERA_HEIGHT_OFFSET = 1.6;
const GROUND_SAMPLE_INTERVAL = 1 / 15;
const GROUND_NORMAL_MIN_Y = 0.35;
const WALL_NORMAL_MAX_Y = 0.45;
const COLLISION_PADDING = 0.16;
const COLLISION_PROBE_HEIGHTS = [0.45, 0.95, 1.35];
const GROUND_MAX_STEP_UP = 0.75;
const GROUND_MAX_STEP_DOWN = 4;

const BOUNDS = {
  minX: -40,
  maxX: 40,
  minZ: -40,
  maxZ: 40,
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function shortestAngleDiff(target, current) {
  return ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

/* ===================== VRM AVATAR ===================== */

function setBlink(vrm, value) {
  if (!vrm) return;
  const manager = vrm.expressionManager;
  if (manager?.setValue) manager.setValue("blink", value);
}

function VrmAvatar({ positionRef, yawRef, visible, moveAmountRef, walkTimeRef }) {
  const [vrmScene, setVrmScene] = useState(null);
  const [vrmInstance, setVrmInstance] = useState(null);

  const fallbackRef = useRef();
  const idleBoneRotationsRef = useRef(null);
  const blinkClockRef = useRef(0);
  const nextBlinkRef = useRef(1 + Math.random() * 2);
  const blinkProgressRef = useRef(0);

  const bonesRef = useRef({});

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load("/model/model.vrm", (gltf) => {
      const vrm = gltf.userData.vrm;
      if (!vrm) return;

      vrm.scene.scale.setScalar(1.35);
      vrm.scene.rotation.y = AVATAR_YAW_OFFSET;

      const getBone = (name) => vrm.humanoid?.getNormalizedBoneNode(name);

      const bones = {
        leftUpperArm: getBone("leftUpperArm"),
        rightUpperArm: getBone("rightUpperArm"),
        leftUpperLeg: getBone("leftUpperLeg"),
        rightUpperLeg: getBone("rightUpperLeg"),
        hips: getBone("hips"),
      };

      bonesRef.current = bones;

      const idle = {};
      Object.entries(bones).forEach(([k, b]) => {
        if (b) idle[k] = b.quaternion.clone();
      });

      idleBoneRotationsRef.current = idle;

      setVrmScene(vrm.scene);
      setVrmInstance(vrm);
    });
  }, []);

  useFrame((_, delta) => {
    const pos = positionRef.current;
    const yaw = yawRef.current;
    const move = moveAmountRef.current;
    const t = walkTimeRef.current;

    if (vrmScene) {
      const bob = Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.03 * move;
      vrmScene.position.set(pos.x, pos.y + CHARACTER_ROOT_OFFSET + bob, pos.z);
      vrmScene.rotation.y = yaw + AVATAR_YAW_OFFSET;
      vrmScene.visible = visible;
    }

    if (vrmInstance && idleBoneRotationsRef.current) {
      const swing = Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.2 * move;
      const leg = Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.35 * move;

      const apply = (bone, euler) => {
        const node = bonesRef.current[bone];
        const base = idleBoneRotationsRef.current[bone];
        if (!node || !base) return;

        const q = new THREE.Quaternion().setFromEuler(euler).multiply(base);
        node.quaternion.slerp(q, Math.min(1, delta * 8));
      };

      apply("leftUpperArm", new THREE.Euler(-swing, 0, -1.1));
      apply("rightUpperArm", new THREE.Euler(swing, 0, 1.1));
      apply("leftUpperLeg", new THREE.Euler(leg, 0, 0));
      apply("rightUpperLeg", new THREE.Euler(-leg, 0, 0));
      apply("hips", new THREE.Euler(Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.02 * move, 0, 0));

      // blink
      blinkClockRef.current += delta;
      if (blinkClockRef.current > nextBlinkRef.current) {
        blinkProgressRef.current += delta * 10;
        const v =
          blinkProgressRef.current < 0.5
            ? blinkProgressRef.current * 2
            : (1 - blinkProgressRef.current) * 2;

        setBlink(vrmInstance, v);

        if (blinkProgressRef.current >= 1) {
          blinkClockRef.current = 0;
          blinkProgressRef.current = 0;
          nextBlinkRef.current = 1 + Math.random() * 2;
          setBlink(vrmInstance, 0);
        }
      }

      vrmInstance.update(delta);
    }

    if (fallbackRef.current) {
      fallbackRef.current.visible = visible && !vrmScene;
      fallbackRef.current.position.set(pos.x, pos.y + CHARACTER_ROOT_OFFSET, pos.z);
      fallbackRef.current.rotation.y = yaw;
    }
  });

  return (
    <>
      {vrmScene && <primitive object={vrmScene} />}
      <mesh ref={fallbackRef}>
        <capsuleGeometry args={[0.2, 1.2]} />
        <meshStandardMaterial color="skyblue" />
      </mesh>
    </>
  );
}

/* ===================== PLAYER RIG ===================== */

export default function PlayerRig({ mode, terrainCollidersRef }) {
  const { camera } = useThree();

  const pressed = useRef(new Set());
  const positionRef = useRef(new THREE.Vector3(0, 0, 2));
  const yawRef = useRef(0);

  const viewYawRef = useRef(0);
  const pitchRef = useRef(-0.2);

  const moveAmountRef = useRef(0);
  const walkTimeRef = useRef(0);

  const draggingRef = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirectionRef = useRef(new THREE.Vector3(0, -1, 0));
  const collisionDirectionRef = useRef(new THREE.Vector3());
  const collisionNormalRef = useRef(new THREE.Vector3());
  const collisionOriginRef = useRef(new THREE.Vector3());
  const intersectionsRef = useRef([]);
  const groundStateRef = useRef({
    y: Number.NaN,
    sampleTimer: 0,
    lastX: Number.NaN,
    lastZ: Number.NaN,
  });

  const getColliderBuckets = () => {
    const colliders = terrainCollidersRef?.current;

    if (Array.isArray(colliders)) {
      return {
        ground: colliders,
        walls: colliders,
      };
    }

    return {
      ground: colliders?.ground?.length ? colliders.ground : colliders?.walls || [],
      walls: colliders?.walls?.length ? colliders.walls : colliders?.ground || [],
    };
  };

  const isWalkableSurface = (intersection) => {
    if (!intersection?.face) return true;

    const normal = collisionNormalRef.current
      .copy(intersection.face.normal)
      .transformDirection(intersection.object.matrixWorld);

    return normal.y >= GROUND_NORMAL_MIN_Y;
  };

  const getGroundY = (x, z, currentGroundY) => {
    const { ground, walls } = getColliderBuckets();
    const colliders = ground.length ? ground : walls;
    if (!colliders.length) return Number.isFinite(currentGroundY) ? currentGroundY : 0;

    const raycaster = raycasterRef.current;

    // Prefer nearby walkable surfaces to avoid snapping to overhead roofs.
    if (Number.isFinite(currentGroundY)) {
      rayOriginRef.current.set(x, currentGroundY + GROUND_MAX_STEP_UP + 0.25, z);
      raycaster.set(rayOriginRef.current, rayDirectionRef.current);
      raycaster.near = 0;
      raycaster.far = GROUND_MAX_STEP_UP + GROUND_MAX_STEP_DOWN + 0.5;

      intersectionsRef.current.length = 0;
      const localIntersections = raycaster.intersectObjects(colliders, true, intersectionsRef.current);

      let bestLocalY = null;
      let bestLocalDelta = Number.POSITIVE_INFINITY;
      for (const intersection of localIntersections) {
        if (!isWalkableSurface(intersection)) continue;

        const deltaY = intersection.point.y - currentGroundY;
        if (deltaY > GROUND_MAX_STEP_UP || deltaY < -GROUND_MAX_STEP_DOWN) continue;

        const absDelta = Math.abs(deltaY);
        if (absDelta < bestLocalDelta) {
          bestLocalDelta = absDelta;
          bestLocalY = intersection.point.y;
        }
      }

      if (bestLocalY !== null) {
        return bestLocalY;
      }
    }

    // Fallback for spawn/recovery: find any valid walkable surface from above.
    rayOriginRef.current.set(x, RAYCAST_HEIGHT, z);
    raycaster.set(rayOriginRef.current, rayDirectionRef.current);
    raycaster.near = 0;
    raycaster.far = RAYCAST_HEIGHT * 2;

    intersectionsRef.current.length = 0;
    const intersections = raycaster.intersectObjects(colliders, true, intersectionsRef.current);
    let bestFallbackY = null;
    for (const intersection of intersections) {
      if (isWalkableSurface(intersection)) {
        bestFallbackY = intersection.point.y;
        break;
      }
    }

    return bestFallbackY ?? (Number.isFinite(currentGroundY) ? currentGroundY : 0);
  };

  const hasForwardCollision = (deltaX, deltaZ) => {
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance < 0.0001) return false;

    const { walls } = getColliderBuckets();
    if (!walls.length) return false;

    const raycaster = raycasterRef.current;
    collisionDirectionRef.current.set(deltaX / distance, 0, deltaZ / distance);
    raycaster.near = 0;
    raycaster.far = distance + COLLISION_PADDING;

    for (const probeHeight of COLLISION_PROBE_HEIGHTS) {
      collisionOriginRef.current.set(
        positionRef.current.x,
        positionRef.current.y + probeHeight,
        positionRef.current.z
      );

      raycaster.set(collisionOriginRef.current, collisionDirectionRef.current);
      intersectionsRef.current.length = 0;
      const intersections = raycaster.intersectObjects(walls, true, intersectionsRef.current);

      for (const intersection of intersections) {
        if (!intersection.face) {
          return true;
        }

        const normal = collisionNormalRef.current
          .copy(intersection.face.normal)
          .transformDirection(intersection.object.matrixWorld);

        // Treat near-vertical geometry as blocking walls.
        if (Math.abs(normal.y) <= WALL_NORMAL_MAX_Y) {
          return true;
        }
      }
    }

    return false;
  };

  /* -------- INPUT -------- */

  useEffect(() => {
    const down = (e) => pressed.current.add(e.key);
    const up = (e) => pressed.current.delete(e.key);

    const mouseDown = (e) => {
      if (e.button !== 0) return;
      draggingRef.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const mouseMove = (e) => {
      if (!draggingRef.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;

      viewYawRef.current -= dx * LOOK_SENSITIVITY;
      pitchRef.current = clamp(
        pitchRef.current - dy * LOOK_SENSITIVITY,
        MIN_PITCH,
        MAX_PITCH
      );

      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const mouseUp = () => (draggingRef.current = false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, []);

  /* -------- MAIN LOOP -------- */

  useFrame((_, delta) => {
    const key = pressed.current;

    const dx =
      (key.has("d") || key.has("ArrowRight") ? 1 : 0) -
      (key.has("a") || key.has("ArrowLeft") ? 1 : 0);
    const dz =
      (key.has("s") || key.has("ArrowDown") ? 1 : 0) -
      (key.has("w") || key.has("ArrowUp") ? 1 : 0);

    const camForward = new THREE.Vector3(
      Math.sin(viewYawRef.current),
      0,
      -Math.cos(viewYawRef.current)
    );

    const camRight = new THREE.Vector3(
      Math.cos(viewYawRef.current),
      0,
      Math.sin(viewYawRef.current)
    );

    const moveDir = new THREE.Vector3();
    if (dx || dz) {
      moveDir.addScaledVector(camRight, dx);
      moveDir.addScaledVector(camForward, -dz);
      moveDir.normalize();

      const stepDistance = SPEED * delta;
      const moveX = moveDir.x * stepDistance;
      const moveZ = moveDir.z * stepDistance;
      let moved = false;

      if (!hasForwardCollision(moveX, moveZ)) {
        positionRef.current.x += moveX;
        positionRef.current.z += moveZ;
        moved = true;
      } else {
        // Try axis-by-axis movement as a simple sliding behavior.
        if (Math.abs(moveX) > 0.0001 && !hasForwardCollision(moveX, 0)) {
          positionRef.current.x += moveX;
          moved = true;
        }
        if (Math.abs(moveZ) > 0.0001 && !hasForwardCollision(0, moveZ)) {
          positionRef.current.z += moveZ;
          moved = true;
        }
      }

      positionRef.current.x = clamp(positionRef.current.x, BOUNDS.minX, BOUNDS.maxX);
      positionRef.current.z = clamp(positionRef.current.z, BOUNDS.minZ, BOUNDS.maxZ);

      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      yawRef.current += shortestAngleDiff(targetYaw, yawRef.current) * delta * 10;

      moveAmountRef.current = moved ? 1 : 0;
    } else {
      moveAmountRef.current = 0;
    }

    const groundState = groundStateRef.current;
    groundState.sampleTimer += delta;

    if (groundState.sampleTimer >= GROUND_SAMPLE_INTERVAL || Number.isNaN(groundState.lastX)) {
      const sampledY = getGroundY(
        positionRef.current.x,
        positionRef.current.z,
        groundState.y
      );
      if (Number.isFinite(sampledY)) {
        groundState.y = sampledY;
      }
      groundState.lastX = positionRef.current.x;
      groundState.lastZ = positionRef.current.z;
      groundState.sampleTimer = 0;
    }

    if (Number.isFinite(groundState.y)) {
      positionRef.current.y = groundState.y + FEET_HEIGHT_OFFSET;
    }

    walkTimeRef.current += delta * (0.5 + moveAmountRef.current * WALK_CYCLE_SPEED);

    const headBob =
      Math.sin(walkTimeRef.current * WALK_CYCLE_FREQUENCY) *
      0.03 *
      moveAmountRef.current;

    /* --- CAMERA --- */

    const pitchCos = Math.cos(pitchRef.current);
    const pitchSin = Math.sin(pitchRef.current);

    if (mode === "first-person") {
      const pos = new THREE.Vector3(
        positionRef.current.x,
        positionRef.current.y + CAMERA_HEIGHT_OFFSET + headBob,
        positionRef.current.z
      );

      const look = new THREE.Vector3(
        Math.sin(viewYawRef.current) * pitchCos,
        pitchSin,
        -Math.cos(viewYawRef.current) * pitchCos
      );

      camera.position.lerp(pos, delta * 10);
      camera.lookAt(pos.clone().add(look));
      return;
    }

    const orbit = new THREE.Vector3(
      Math.sin(viewYawRef.current) * pitchCos,
      pitchSin,
      -Math.cos(viewYawRef.current) * pitchCos
    );

    const camPos = new THREE.Vector3()
      .copy(positionRef.current)
      .addScaledVector(orbit, -3.5)
      .add(new THREE.Vector3(0, CAMERA_HEIGHT_OFFSET + headBob, 0));

    const lookAt = new THREE.Vector3()
      .copy(positionRef.current)
      .add(new THREE.Vector3(0, CHARACTER_ROOT_OFFSET + 0.2, 0));

    camera.position.lerp(camPos, delta * 6);
    camera.lookAt(lookAt);
  });

  return (
    <VrmAvatar
      positionRef={positionRef}
      yawRef={yawRef}
      moveAmountRef={moveAmountRef}
      walkTimeRef={walkTimeRef}
      visible={mode === "third-person"}
    />
  );
}