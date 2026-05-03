import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

const SPEED = 3.2;
const AVATAR_YAW_OFFSET = 0;
const NON_DEFAULT_AVATAR_YAW_OFFSET = Math.PI;
const LOOK_SENSITIVITY = 0.005;
const MIN_PITCH = -0.85;
const MAX_PITCH = 0.75;
const WALK_CYCLE_FREQUENCY = 6;
const WALK_CYCLE_SPEED = 1.4;
const RAYCAST_HEIGHT = 60;
const FEET_HEIGHT_OFFSET = 0.02;
const CHARACTER_ROOT_OFFSET = 0.0;
const CAMERA_HEIGHT_OFFSET = 1;
const THIRD_PERSON_CAMERA_DISTANCE = 5.0;
const GROUND_SAMPLE_INTERVAL_MOVING = 1 / 120;
const GROUND_SAMPLE_INTERVAL_IDLE = 1 / 12;
const GROUND_NORMAL_MIN_Y = 0.3;
const WALL_NORMAL_MAX_Y = 0.45;
const COLLISION_PADDING = 0.22;
const COLLISION_PROBE_HEIGHTS = [0.2, 0.6, 1.0, 1.4];
const GROUND_MAX_STEP_UP = 0.75;
const GROUND_MAX_STEP_DOWN = 4;
const FORCE_BLOCKING_NAME_PATTERN = /^(rocks_pack|rock__1|ruins(?:_.+)?)$/i;
const GRAVITY = 18;
const JUMP_VELOCITY = 6.2;
const MAX_FALL_SPEED = 20;
const JUMP_BUFFER_TIME = 0.12;
const POSITION_REPORT_INTERVAL = 0.1;

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

function isDefaultAvatarModel(avatarModelPath) {
  return typeof avatarModelPath === "string" && avatarModelPath.includes("model00000.vrm");
}

function VrmAvatar({
  positionRef,
  yawRef,
  visible,
  moveAmountRef,
  walkTimeRef,
  isGroundedRef,
  verticalVelocityRef,
  avatarModelPath,
}) {
  const [vrmScene, setVrmScene] = useState(null);
  const [vrmInstance, setVrmInstance] = useState(null);
  const isDefaultModel = isDefaultAvatarModel(avatarModelPath);
  const avatarYawOffset = isDefaultModel ? AVATAR_YAW_OFFSET : NON_DEFAULT_AVATAR_YAW_OFFSET;

  const fallbackRef = useRef();
  const idleBoneRotationsRef = useRef(null);
  const blinkClockRef = useRef(0);
  const nextBlinkRef = useRef(1 + Math.random() * 2);
  const blinkProgressRef = useRef(0);

  const bonesRef = useRef({});

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    let cancelled = false;

    setVrmScene(null);
    setVrmInstance(null);
    bonesRef.current = {};
    idleBoneRotationsRef.current = null;

    loader.load(avatarModelPath, (gltf) => {
      if (cancelled) return;

      const vrm = gltf.userData.vrm;
      if (!vrm) return;

      vrm.scene.scale.setScalar(1.35);
      vrm.scene.rotation.y = avatarYawOffset;

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
    }, undefined, () => {
      if (cancelled) return;
      setVrmScene(null);
      setVrmInstance(null);
    });

    return () => {
      cancelled = true;
    };
  }, [avatarModelPath, avatarYawOffset]);

  useFrame((_, delta) => {
    const pos = positionRef.current;
    const yaw = yawRef.current;
    const move = moveAmountRef.current;
    const t = walkTimeRef.current;
    const grounded = isGroundedRef.current;
    const verticalVelocity = verticalVelocityRef.current;

    if (vrmScene) {
      const groundedMove = grounded ? move : move * 0.35;
      const bob = Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.03 * groundedMove;
      vrmScene.position.set(pos.x, pos.y + CHARACTER_ROOT_OFFSET + bob, pos.z);
      vrmScene.rotation.y = yaw + avatarYawOffset;
      vrmScene.visible = visible;
    }

    if (vrmInstance && idleBoneRotationsRef.current) {
      const locomotionFactor = grounded ? 1 : 0.35;
      const swing = Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.2 * move * locomotionFactor;
      const leg = Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.35 * move * locomotionFactor;
      const armRestZ = isDefaultModel ? 1.1 : -1.3;
      const armLiftFactor = isDefaultModel ? 1 : 0.35;

      const airborneBlend = grounded ? 0 : 1;
      const ascentBlend = grounded ? 0 : clamp(verticalVelocity / JUMP_VELOCITY, 0, 1);
      const descentBlend = grounded ? 0 : clamp(-verticalVelocity / MAX_FALL_SPEED, 0, 1);
      const jumpLegOffset = airborneBlend * (0.12 + descentBlend * 0.08 - ascentBlend * 0.08);

      const apply = (bone, euler) => {
        const node = bonesRef.current[bone];
        const base = idleBoneRotationsRef.current[bone];
        if (!node || !base) return;

        const q = new THREE.Quaternion().setFromEuler(euler).multiply(base);
        node.quaternion.slerp(q, Math.min(1, delta * 8));
      };

      apply(
        "leftUpperArm",
        new THREE.Euler(
          -swing * armLiftFactor - airborneBlend * 0.24 * armLiftFactor,
          0,
          -armRestZ + airborneBlend * 0.08
        )
      );
      apply(
        "rightUpperArm",
        new THREE.Euler(
          swing * armLiftFactor - airborneBlend * 0.24 * armLiftFactor,
          0,
          armRestZ - airborneBlend * 0.08
        )
      );

      apply(
        "leftUpperLeg",
        new THREE.Euler(leg + jumpLegOffset, 0, 0)
      );
      apply(
        "rightUpperLeg",
        new THREE.Euler(-leg + jumpLegOffset, 0, 0)
      );

      apply(
        "hips",
        new THREE.Euler(
          Math.sin(t * WALK_CYCLE_FREQUENCY) * 0.02 * move * locomotionFactor,
          0,
          0
        )
      );

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

export default function PlayerRig({ mode, terrainCollidersRef, onPositionChange, avatarModelPath }) {
  const { camera } = useThree();

  const pressed = useRef(new Set());
  const positionRef = useRef(new THREE.Vector3(0, 0, 2));
  const yawRef = useRef(0);

  const viewYawRef = useRef(0);
  const pitchRef = useRef(-0.2);

  const moveAmountRef = useRef(0);
  const walkTimeRef = useRef(0);
  const verticalVelocityRef = useRef(0);
  const isGroundedRef = useRef(true);
  const jumpBufferTimerRef = useRef(0);

  const draggingRef = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirectionRef = useRef(new THREE.Vector3(0, -1, 0));
  const collisionDirectionRef = useRef(new THREE.Vector3());
  const collisionNormalRef = useRef(new THREE.Vector3());
  const collisionOriginRef = useRef(new THREE.Vector3());
  const intersectionsRef = useRef([]);
  const positionReportRef = useRef({
    timer: 0,
    lastSignature: "",
  });
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
        alwaysBlockNames: new Set(),
      };
    }

    return {
      ground: colliders?.ground?.length ? colliders.ground : colliders?.walls || [],
      walls: colliders?.walls?.length ? colliders.walls : colliders?.ground || [],
      alwaysBlockNames: new Set(
        (colliders?.alwaysBlockNames || []).map((name) => String(name).toLowerCase())
      ),
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
    let bestFallbackDelta = Number.POSITIVE_INFINITY;

    for (const intersection of intersections) {
      if (!isWalkableSurface(intersection)) continue;

      if (Number.isFinite(currentGroundY)) {
        const absDelta = Math.abs(intersection.point.y - currentGroundY);
        if (absDelta < bestFallbackDelta) {
          bestFallbackDelta = absDelta;
          bestFallbackY = intersection.point.y;
        }
      } else if (bestFallbackY === null || intersection.point.y < bestFallbackY) {
        // On initial spawn, prefer the lowest walkable hit to avoid roofs/props.
        bestFallbackY = intersection.point.y;
      }
    }

    return bestFallbackY ?? (Number.isFinite(currentGroundY) ? currentGroundY : 0);
  };

  const hasForwardCollision = (deltaX, deltaZ) => {
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance < 0.0001) return false;

    const { walls, alwaysBlockNames } = getColliderBuckets();
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
        const objectName = intersection.object?.name || "";
        if (
          FORCE_BLOCKING_NAME_PATTERN.test(objectName) ||
          alwaysBlockNames.has(objectName.toLowerCase())
        ) {
          return true;
        }

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
    const down = (e) => {
      pressed.current.add(e.key);

      if (e.code === "Space") {
        e.preventDefault();
        jumpBufferTimerRef.current = JUMP_BUFFER_TIME;
      }
    };
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

  useEffect(() => {
    if (!onPositionChange) return;

    onPositionChange({
      x: Number(positionRef.current.x.toFixed(2)),
      y: Number(positionRef.current.y.toFixed(2)),
      z: Number(positionRef.current.z.toFixed(2)),
      yaw: Number(yawRef.current.toFixed(4)),
    });
  }, [onPositionChange]);

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

      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      yawRef.current += shortestAngleDiff(targetYaw, yawRef.current) * delta * 10;

      moveAmountRef.current = moved ? 1 : 0;
    } else {
      moveAmountRef.current = 0;
    }

    const groundState = groundStateRef.current;
    groundState.sampleTimer += delta;
    const sampleInterval =
      moveAmountRef.current > 0 ? GROUND_SAMPLE_INTERVAL_MOVING : GROUND_SAMPLE_INTERVAL_IDLE;

    if (groundState.sampleTimer >= sampleInterval || Number.isNaN(groundState.lastX)) {
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

    const hasGroundSample = Number.isFinite(groundState.y);
    const groundY = hasGroundSample
      ? groundState.y + FEET_HEIGHT_OFFSET
      : positionRef.current.y;

    jumpBufferTimerRef.current = Math.max(0, jumpBufferTimerRef.current - delta);

    if (isGroundedRef.current) {
      if (hasGroundSample) {
        positionRef.current.y = groundY;
      }

      if (!hasGroundSample) {
        isGroundedRef.current = false;
      } else if (jumpBufferTimerRef.current > 0) {
        jumpBufferTimerRef.current = 0;
        isGroundedRef.current = false;
        verticalVelocityRef.current = JUMP_VELOCITY;
      }
    } else {
      verticalVelocityRef.current = Math.max(
        verticalVelocityRef.current - GRAVITY * delta,
        -MAX_FALL_SPEED
      );
      positionRef.current.y += verticalVelocityRef.current * delta;

      if (hasGroundSample && verticalVelocityRef.current <= 0 && positionRef.current.y <= groundY) {
        positionRef.current.y = groundY;
        verticalVelocityRef.current = 0;
        isGroundedRef.current = true;
      }
    }

    walkTimeRef.current += delta * (0.5 + moveAmountRef.current * WALK_CYCLE_SPEED);

    const headBob =
      Math.sin(walkTimeRef.current * WALK_CYCLE_FREQUENCY) *
      0.03 *
      moveAmountRef.current;

    /* --- CAMERA --- */

    const pitchCos = Math.cos(pitchRef.current);
    const pitchSin = Math.sin(pitchRef.current);

    if (onPositionChange) {
      const positionReport = positionReportRef.current;
      positionReport.timer += delta;

      if (positionReport.timer >= POSITION_REPORT_INTERVAL) {
        positionReport.timer = 0;

        const x = Number(positionRef.current.x.toFixed(2));
        const y = Number(positionRef.current.y.toFixed(2));
        const z = Number(positionRef.current.z.toFixed(2));
        const signature = `${x}|${y}|${z}`;

        if (signature !== positionReport.lastSignature) {
          positionReport.lastSignature = signature;
          onPositionChange({ x, y, z, yaw: Number(yawRef.current.toFixed(4)) });
        }
      }
    }

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
      .addScaledVector(orbit, -THIRD_PERSON_CAMERA_DISTANCE)
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
      isGroundedRef={isGroundedRef}
      verticalVelocityRef={verticalVelocityRef}
      visible={mode === "third-person"}
      avatarModelPath={avatarModelPath}
    />
  );
}