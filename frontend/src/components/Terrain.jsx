import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";

const TERRAIN_MODEL_URL = "/psx-temple-island/source/envoriment.glb";
const TERRAIN_SCALE = 1;
const GROUND_NAME_PATTERN = /^(Island_basemesh|island_cave|bridge|port|ruins)$/i;
const NON_BLOCKING_NAME_PATTERN = /^(skybox|Ocean_plane)$/i;
const FORCE_BLOCKING_NAME_PATTERN = /^(rocks_pack|rock__1)$/i;

export default function Terrain({ collidersRef }) {
  const { scene } = useGLTF(TERRAIN_MODEL_URL);

  useEffect(() => {
    scene.scale.setScalar(TERRAIN_SCALE);
    scene.updateMatrixWorld(true);

    const meshCandidates = [];

    scene.traverse((obj) => {
      if (!obj.isMesh) return;

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
  }, [scene, collidersRef]);

  return <primitive object={scene} frustumCulled />;
}

useGLTF.preload(TERRAIN_MODEL_URL);
