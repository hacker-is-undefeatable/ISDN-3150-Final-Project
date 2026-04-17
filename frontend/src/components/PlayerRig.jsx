import { useEffect, useMemo, useRef, useState } from "react";
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

const BOUNDS = {
  minX: -4.2,
  maxX: 4.2,
  minZ: -4.2,
  maxZ: 4.2,
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
      vrmScene.position.set(pos.x, bob, pos.z);
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
      fallbackRef.current.position.set(pos.x, 1, pos.z);
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

export default function PlayerRig({ mode }) {
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

      positionRef.current.addScaledVector(moveDir, SPEED * delta);

      positionRef.current.x = clamp(positionRef.current.x, BOUNDS.minX, BOUNDS.maxX);
      positionRef.current.z = clamp(positionRef.current.z, BOUNDS.minZ, BOUNDS.maxZ);

      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      yawRef.current += shortestAngleDiff(targetYaw, yawRef.current) * delta * 10;

      moveAmountRef.current = 1;
    } else {
      moveAmountRef.current = 0;
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
        1.6 + headBob,
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
      .add(new THREE.Vector3(0, 1.6 + headBob, 0));

    const lookAt = new THREE.Vector3()
      .copy(positionRef.current)
      .add(new THREE.Vector3(0, 1.2, 0));

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