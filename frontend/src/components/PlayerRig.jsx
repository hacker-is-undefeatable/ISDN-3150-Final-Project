import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

const SPEED = 3.2;
const AVATAR_YAW_OFFSET = Math.PI;
const LOOK_SENSITIVITY = 0.005;
const MIN_PITCH = -0.85;
const MAX_PITCH = 0.75;
const BOUNDS = {
  minX: -4.2,
  maxX: 4.2,
  minZ: -4.2,
  maxZ: 4.2,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setBlink(vrm, value) {
  if (!vrm) return;

  const manager = vrm.expressionManager;
  if (manager) {
    if (typeof manager.setValue === "function") {
      manager.setValue("blink", value);
      return;
    }
  }

  const proxy = vrm.blendShapeProxy;
  if (proxy && proxy.setValue && proxy.getBlendShapeTrackName) {
    const name = proxy.getBlendShapeTrackName("blink");
    if (name) {
      proxy.setValue(name, value);
    }
  }
}

function VrmAvatar({ positionRef, yawRef, visible, moveAmountRef, walkTimeRef }) {
  const [vrmScene, setVrmScene] = useState(null);
  const [vrmInstance, setVrmInstance] = useState(null);
  const fallbackRef = useRef();
  const idleBoneRotationsRef = useRef(null);
  const blinkClockRef = useRef(0);
  const nextBlinkRef = useRef(1.3 + Math.random() * 2.0);
  const blinkProgressRef = useRef(0);

  const armNodesRef = useRef({
    leftUpperArm: null,
    rightUpperArm: null,
    leftLowerArm: null,
    rightLowerArm: null,
    leftUpperLeg: null,
    rightUpperLeg: null,
    hips: null,
  });

  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      "/model/model.vrm",
      (gltf) => {
        if (!mounted) return;
        const vrm = gltf.userData.vrm;
        if (!vrm) return;

        vrm.scene.scale.setScalar(1.35);
        vrm.scene.rotation.y = AVATAR_YAW_OFFSET;

        const getBone = (name) => vrm.humanoid?.getNormalizedBoneNode(name) || null;
        armNodesRef.current = {
          leftUpperArm: getBone("leftUpperArm"),
          rightUpperArm: getBone("rightUpperArm"),
          leftLowerArm: getBone("leftLowerArm"),
          rightLowerArm: getBone("rightLowerArm"),
          leftUpperLeg: getBone("leftUpperLeg"),
          rightUpperLeg: getBone("rightUpperLeg"),
          hips: getBone("hips"),
        };

        const idle = {};
        Object.entries(armNodesRef.current).forEach(([key, node]) => {
          if (node) idle[key] = node.quaternion.clone();
        });
        idleBoneRotationsRef.current = idle;

        setVrmScene(vrm.scene);
        setVrmInstance(vrm);
      },
      undefined,
      () => {
        if (!mounted) return;
        setVrmScene(null);
      }
    );

    return () => {
      mounted = false;
    };
  }, []);

  useFrame((_, delta) => {
    const pos = positionRef.current;
    const yaw = yawRef.current;
    const moveAmount = moveAmountRef.current;
    const walkTime = walkTimeRef.current;

    if (vrmScene) {
      vrmScene.visible = visible;
      const bodyBob = Math.sin(walkTime * 7.8) * 0.03 * moveAmount;
      vrmScene.position.set(pos.x, bodyBob, pos.z);
      vrmScene.rotation.y = yaw + AVATAR_YAW_OFFSET;
    }

    if (vrmInstance) {
      const idle = idleBoneRotationsRef.current;
      const bones = armNodesRef.current;
      if (idle) {
        const swing = Math.sin(walkTime * 7.8) * 0.16 * moveAmount;
        const legSwing = Math.sin(walkTime * 7.8) * 0.3 * moveAmount;

        const applyBone = (boneKey, targetEuler) => {
          const node = bones[boneKey];
          const base = idle[boneKey];
          if (!node || !base) return;

          const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);
          targetQuat.multiply(base);
          node.quaternion.slerp(targetQuat, Math.min(1, delta * 9));
        };

        // Arms lowered and resting by the sides with subtle walk swing.
        applyBone("leftUpperArm", new THREE.Euler(0- 3*swing, 0 - 5*swing, -1.1));
        applyBone("rightUpperArm", new THREE.Euler(0+ 3*swing , 0 - 5*swing, 1.1));
        applyBone("leftLowerArm", new THREE.Euler(0, 0, 0));
        applyBone("rightLowerArm", new THREE.Euler(0, 0, 0));

        // Light leg animation while walking.
        applyBone("leftUpperLeg", new THREE.Euler(legSwing, 0, 0));
        applyBone("rightUpperLeg", new THREE.Euler(-legSwing, 0, 0));
        applyBone("hips", new THREE.Euler(Math.sin(walkTime * 7.8) * 0.02 * moveAmount, 0, 0));
      }

      // Procedural blink.
      blinkClockRef.current += delta;
      if (blinkClockRef.current >= nextBlinkRef.current) {
        blinkProgressRef.current += delta * 10;
        const openClose = blinkProgressRef.current <= 0.5
          ? blinkProgressRef.current * 2
          : (1 - blinkProgressRef.current) * 2;
        setBlink(vrmInstance, Math.max(0, Math.min(1, openClose)));

        if (blinkProgressRef.current >= 1) {
          blinkClockRef.current = 0;
          blinkProgressRef.current = 0;
          nextBlinkRef.current = 1.2 + Math.random() * 2.2;
          setBlink(vrmInstance, 0);
        }
      }

      vrmInstance.update(delta);
    }

    if (fallbackRef.current) {
      fallbackRef.current.visible = visible && !vrmScene;
      const bodyBob = Math.sin(walkTime * 7.8) * 0.03 * moveAmount;
      fallbackRef.current.position.set(pos.x, 0.95 + bodyBob, pos.z);
      fallbackRef.current.rotation.y = yaw;
    }
  });

  return (
    <>
      {vrmScene ? <primitive object={vrmScene} /> : null}
      <mesh ref={fallbackRef} castShadow>
        <capsuleGeometry args={[0.22, 1.25, 4, 12]} />
        <meshStandardMaterial color="#65a2c7" />
      </mesh>
    </>
  );
}

export default function PlayerRig({ mode }) {
  const { camera } = useThree();
  const pressed = useRef(new Set());
  const positionRef = useRef(new THREE.Vector3(0, 0, 2.5));
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.12);
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const moveAmountRef = useRef(0);
  const walkTimeRef = useRef(0);

  const forward = useMemo(() => new THREE.Vector3(), []);
  const targetCameraPos = useMemo(() => new THREE.Vector3(), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(), []);
  const moveDir = useMemo(() => new THREE.Vector3(), []);
  const lookAhead = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const down = (event) => {
      pressed.current.add(event.key);
    };
    const up = (event) => {
      pressed.current.delete(event.key);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const onMouseDown = (event) => {
      if (event.button !== 0) return;
      draggingRef.current = true;
      lastMouseRef.current.x = event.clientX;
      lastMouseRef.current.y = event.clientY;
    };

    const onMouseUp = (event) => {
      if (event.button !== 0) return;
      draggingRef.current = false;
    };

    const onMouseMove = (event) => {
      if (!draggingRef.current) return;

      const dx = event.clientX - lastMouseRef.current.x;
      const dy = event.clientY - lastMouseRef.current.y;

      yawRef.current -= dx * LOOK_SENSITIVITY;
      pitchRef.current = clamp(
        pitchRef.current - dy * LOOK_SENSITIVITY,
        MIN_PITCH,
        MAX_PITCH
      );

      lastMouseRef.current.x = event.clientX;
      lastMouseRef.current.y = event.clientY;
    };

    const onWindowBlur = () => {
      draggingRef.current = false;
    };

    const onContextMenu = (event) => {
      if (draggingRef.current) {
        event.preventDefault();
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  useFrame((_, delta) => {
    const key = pressed.current;

    const moveForward = key.has("w") || key.has("W") || key.has("ArrowUp");
    const moveBackward = key.has("s") || key.has("S") || key.has("ArrowDown");
    const moveLeft = key.has("a") || key.has("A") || key.has("ArrowLeft");
    const moveRight = key.has("d") || key.has("D") || key.has("ArrowRight");

    const dx = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
    const dz = (moveBackward ? 1 : 0) - (moveForward ? 1 : 0);

    let speed = 0;
    if (dx !== 0 || dz !== 0) {
      moveDir.set(dx, 0, dz).normalize();
      positionRef.current.x = clamp(positionRef.current.x + moveDir.x * SPEED * delta, BOUNDS.minX, BOUNDS.maxX);
      positionRef.current.z = clamp(positionRef.current.z + moveDir.z * SPEED * delta, BOUNDS.minZ, BOUNDS.maxZ);
      speed = SPEED;

      const targetYaw = Math.atan2(moveDir.x, -moveDir.z);
      const diff = ((targetYaw - yawRef.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      yawRef.current += diff * Math.min(1, delta * 7.5);
    }

    moveAmountRef.current = Math.min(1, speed / SPEED);
    walkTimeRef.current += delta * (0.4 + moveAmountRef.current * 1.2);

    forward.set(Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
    const pitchCos = Math.cos(pitchRef.current);
    const pitchSin = Math.sin(pitchRef.current);
    const headBob = Math.sin(walkTimeRef.current * 7.8) * 0.03 * moveAmountRef.current;

    if (mode === "first-person") {
      targetCameraPos.set(positionRef.current.x, 1.62 + headBob, positionRef.current.z);
      lookAhead.set(
        Math.sin(yawRef.current) * pitchCos,
        pitchSin,
        -Math.cos(yawRef.current) * pitchCos
      ).multiplyScalar(6);
      targetLookAt.copy(targetCameraPos).add(lookAhead);
      camera.position.lerp(targetCameraPos, Math.min(1, delta * 9));
      camera.lookAt(targetLookAt);
      return;
    }

    const orbitDistance = 3.4;
    lookAhead.set(
      Math.sin(yawRef.current) * pitchCos,
      pitchSin,
      -Math.cos(yawRef.current) * pitchCos
    );

    targetCameraPos
      .copy(positionRef.current)
      .addScaledVector(lookAhead, -orbitDistance)
      .add(new THREE.Vector3(0, 1.6 + headBob * 0.5, 0));
    targetLookAt.copy(positionRef.current).add(new THREE.Vector3(0, 1.1, 0));

    camera.position.lerp(targetCameraPos, Math.min(1, delta * 7));
    camera.lookAt(targetLookAt);
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
