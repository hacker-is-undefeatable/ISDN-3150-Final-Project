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

        vrm.scene.scale.setScalar(1.3);
        vrm.scene.rotation.set(0, Math.PI, 0);
        vrm.scene.position.set(0, 0, 0);

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
  });

  return <group ref={group} />;
}
