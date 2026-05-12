import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

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

export default function NPCModel({ modelPath }) {
  const group = useRef();
  const [vrmInstance, setVrmInstance] = useState(null);
  const vrmRef = useRef(null);

  const disposeMaterial = (material) => {
    if (!material) return;
    Object.keys(material).forEach((key) => {
      const value = material[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    });
    material.dispose?.();
  };

  const disposeVrm = (vrm) => {
    if (!vrm?.scene) return;
    vrm.scene.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) {
        node.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(node.material);
      }
    });
  };

  useEffect(() => {
    if (!modelPath) return;

    let cancelled = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const loadModel = async () => {
      try {
        const gltf = await loader.loadAsync(modelPath);
        if (cancelled) return;

        const vrm = gltf.userData.vrm;
        if (!vrm) return;

        // align scale/rotation/position similar to the character preview
        const baseScale = 1.1;
        const isZhongli = typeof modelPath === "string" && modelPath.includes("model_zhongli.vrm");
        vrm.scene.scale.setScalar(isZhongli ? baseScale / 3 : baseScale);
        vrm.scene.rotation.set(0, 0, 0);
        const isDefaultModel = typeof modelPath === "string" && modelPath.includes("model00000.vrm");
        vrm.scene.rotation.y = isDefaultModel ? 0 : Math.PI;
        // raise character to match preview (moved up by +2)
        vrm.scene.position.set(0, 0, 0);

        // use humanoid bone API to set a relaxed arm pose (matches ModelPreview)
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
          // non-fatal: continue if humanoid API isn't available
        }

        disableVrmOutlines(vrm);

        if (group.current) {
          group.current.clear();
          group.current.add(vrm.scene);
        }

        vrmRef.current = vrm;
        setVrmInstance(vrm);
      } catch (error) {
        if (cancelled) return;
        if (group.current) {
          group.current.clear();
        }
        vrmRef.current = null;
        setVrmInstance(null);
      }
    };

    loadModel();

    return () => {
      cancelled = true;
      if (group.current) {
        group.current.clear();
      }
      if (vrmRef.current) {
        disposeVrm(vrmRef.current);
        vrmRef.current = null;
      }
      setVrmInstance(null);
    };
  }, [modelPath]);

  useFrame((_, delta) => {
    if (vrmInstance) {
      try {
        vrmInstance.update(delta);
      } catch (error) {
        // ignore VRM update errors
      }
    }

    // subtle idle sway/breath to make NPCs feel more natural
    try {
      if (group.current) {
        const t = performance.now() / 1000;
        group.current.rotation.y = Math.sin(t * 0.6) * 0.06;
        group.current.position.y = Math.sin(t * 1.1) * 0.02;
      }
    } catch (e) {
      // ignore idle errors
    }
  });

  return <group ref={group} />;
}
