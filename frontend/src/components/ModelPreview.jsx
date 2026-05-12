import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import { OrbitControls } from "@react-three/drei";

const PREVIEW_LOADING_MS = 8000;

function disableVrmOutlines(vrm) {
  if (!vrm?.scene) return;

  vrm.scene.traverse((node) => {
    if (!node.isMesh) return;

    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];

    const baseMaterial = materials.find((material) => material && !material.isOutline);

    materials.forEach((material) => {
      if (!material?.isMToonMaterial) return;
      material.outlineWidthMode = "none";
      material.outlineWidthFactor = 0;
      material.isOutline = false;
      material.needsUpdate = true;
    });

    if (Array.isArray(node.material) && baseMaterial) {
      node.material = baseMaterial;
    }
  });
}

function VrmPreview({ avatarModelPath }) {
  const group = useRef();
  const vrmRef = useRef();

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    if (!avatarModelPath) return;

    const loadPreview = async () => {
      try {
        const gltf = await loader.loadAsync(avatarModelPath);
        if (cancelled) return;
        const vrm = gltf.userData.vrm;
        if (!vrm) return;
        const isDefaultModel =
          typeof avatarModelPath === "string" && avatarModelPath.includes("model00000.vrm");
        vrm.scene.rotation.set(0, 0, 0);
        vrm.scene.scale.setScalar(1.1);
        vrm.scene.rotation.y = isDefaultModel ? 0 : Math.PI;
        vrm.scene.position.set(0, -1, 0);

        disableVrmOutlines(vrm);
        vrmRef.current = vrm;
        if (group.current) {
          group.current.clear();
          group.current.add(vrm.scene);
        }

        try {
          const armRestZ = isDefaultModel ? 1.1 : -1.3;
          const armLift = isDefaultModel ? 1 : 0.12;

          const get = (name) => vrm.humanoid?.getNormalizedBoneNode(name);

          const leftUpper = get("leftUpperArm");
          const rightUpper = get("rightUpperArm");
          const leftLower = get("leftLowerArm");
          const rightLower = get("rightLowerArm");

          if (leftUpper) {
            const e = new THREE.Euler(-0.05 * armLift, 0, -armRestZ);
            leftUpper.quaternion.copy(new THREE.Quaternion().setFromEuler(e));
          }
          if (rightUpper) {
            const e = new THREE.Euler(-0.05 * armLift, 0, armRestZ);
            rightUpper.quaternion.copy(new THREE.Quaternion().setFromEuler(e));
          }

          if (leftLower) {
            const e = new THREE.Euler(0, 0.15, 0);
            leftLower.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));
          }
          if (rightLower) {
            const e = new THREE.Euler(0, -0.15, 0);
            rightLower.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));
          }
        } catch (e) {
        }
      } catch (error) {
        if (cancelled) return;
        if (group.current) {
          group.current.clear();
        }
        vrmRef.current = null;
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [avatarModelPath]);

  useFrame((_, delta) => {
    if (vrmRef.current) {
      try {
        vrmRef.current.update(delta);
      } catch (e) {}
    }
  });

  return <group ref={group} />;
}

export default function ModelPreview({ avatarModelPath }) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    setIsRevealed(false);

    const timer = window.setTimeout(() => {
      setIsRevealed(true);
    }, PREVIEW_LOADING_MS);

    return () => window.clearTimeout(timer);
  }, [avatarModelPath]);

  return (
    <div className={`model-preview ${isRevealed ? "model-preview--ready" : ""}`} onContextMenu={(e) => e.preventDefault()}>
      {!isRevealed && (
        <div className="model-preview__loading" aria-live="polite" aria-busy="true">
          <div className="model-preview__loading-card">
            <div className="model-preview__loading-spinner" />
            <p>Loading character preview...</p>
          </div>
        </div>
      )}
      <Canvas camera={{ position: [0, 1.2, 2.5], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 5, 5]} intensity={0.8} />
        <VrmPreview avatarModelPath={avatarModelPath} />
        <OrbitControls
          enableDamping={true}
          enableZoom={true}
          enableRotate={true}
          enablePan={true}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
          // limit vertical rotation a bit so model doesn't flip
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI - Math.PI / 6}
        />
      </Canvas>
    </div>
  );
}
