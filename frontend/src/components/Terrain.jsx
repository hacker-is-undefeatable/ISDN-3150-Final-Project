import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const TERRAIN_MODEL_URL = "/psx-temple-island/source/envoriment2.glb";
const TERRAIN_SCALE = 1;
const GROUND_NAME_PATTERN = /^(Island_basemesh|island_cave|bridge|port|ruins)$/i;
const NON_BLOCKING_NAME_PATTERN = /^(skybox|Ocean_plane)$/i;
const FORCE_BLOCKING_NAME_PATTERN = /^(rocks_pack|rock__1|ruins(?:_.+)?)$/i;
const MATERIAL_SHADER_FALLBACK = /clan retainer material/i;

function createFallbackMaterial(material) {
  const color = material?.color ? material.color.clone() : new THREE.Color("#ffffff");
  return new THREE.MeshBasicMaterial({
    color,
    map: material?.map ?? null,
    transparent: Boolean(material?.transparent),
    opacity: typeof material?.opacity === "number" ? material.opacity : 1,
    alphaTest: typeof material?.alphaTest === "number" ? material.alphaTest : 0,
    side: material?.side ?? THREE.FrontSide,
  });
}

export default function Terrain({ collidersRef, onMapBoundsChange }) {
  const { scene } = useGLTF(TERRAIN_MODEL_URL);

  useEffect(() => {
    scene.scale.setScalar(TERRAIN_SCALE);
    scene.updateMatrixWorld(true);

    const meshCandidates = [];

    scene.traverse((obj) => {
      if (!obj.isMesh) return;

      if (obj.material) {
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];

        const updated = materials.map((material) => {
          if (!material?.name) return material;
          if (!MATERIAL_SHADER_FALLBACK.test(material.name)) return material;
          return createFallbackMaterial(material);
        });

        obj.material = Array.isArray(obj.material) ? updated : updated[0];
      }

      // Terrain meshes are typically high-poly; avoid self-shadow casting cost.
      obj.castShadow = false;
      obj.receiveShadow = false;

      const triangles = obj.geometry?.index
        ? obj.geometry.index.count / 3
        : (obj.geometry?.attributes?.position?.count || 0) / 3;

      meshCandidates.push({
        mesh: obj,
        triangles,
      });
    });

    const sorted = [...meshCandidates].sort((a, b) => b.triangles - a.triangles);
    const namedGroundCandidates = sorted.filter(({ mesh }) =>
      GROUND_NAME_PATTERN.test(mesh.name)
    );

    const groundMeshes = namedGroundCandidates.length
      ? namedGroundCandidates.map(({ mesh }) => mesh)
      : sorted.length
      ? [sorted[0].mesh]
      : [];

    const groundMeshSet = new Set(groundMeshes);

    const wallMeshes = sorted
      .filter(({ mesh }) => !groundMeshSet.has(mesh))
      .filter(({ mesh }) => !NON_BLOCKING_NAME_PATTERN.test(mesh.name || ""))
      .map(({ mesh }) => mesh);

    const forcedBlockingMeshes = sorted
      .filter(({ mesh }) => FORCE_BLOCKING_NAME_PATTERN.test(mesh.name || ""))
      .map(({ mesh }) => mesh);

    const finalWallMeshes = Array.from(new Set([...wallMeshes, ...forcedBlockingMeshes]));
    const alwaysBlockNames = forcedBlockingMeshes
      .map((mesh) => (mesh.name || "").toLowerCase())
      .filter(Boolean);

    const bounds = new THREE.Box3();
    const boundsSources = groundMeshes.length ? groundMeshes : finalWallMeshes;

    if (boundsSources.length) {
      for (const mesh of boundsSources) {
        bounds.expandByObject(mesh);
      }
    } else {
      bounds.setFromObject(scene);
    }

    if (onMapBoundsChange && bounds.isEmpty() === false) {
      onMapBoundsChange({
        minX: bounds.min.x,
        maxX: bounds.max.x,
        minZ: bounds.min.z,
        maxZ: bounds.max.z,
      });
    }

    collidersRef.current = {
      ground: groundMeshes,
      walls: finalWallMeshes.length ? finalWallMeshes : groundMeshes,
      alwaysBlockNames,
    };

    return () => {
      collidersRef.current = {
        ground: [],
        walls: [],
        alwaysBlockNames: [],
      };
    };
  }, [scene, collidersRef, onMapBoundsChange]);

  return <primitive object={scene} frustumCulled />;
}

useGLTF.preload(TERRAIN_MODEL_URL);
