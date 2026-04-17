import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";

const TERRAIN_MODEL_URL = "/psx-temple-island/source/envoriment.glb";
const TERRAIN_SCALE = 1;
const GROUND_NAME_PATTERN = /(terrain|ground|island|land|floor|hill|path|cliff|rock)/i;
const MAX_WALL_COLLIDERS = 18;
const DEBUG_TERRAIN_MESHES = import.meta.env.DEV;

export default function Terrain({ collidersRef }) {
  const { scene } = useGLTF(TERRAIN_MODEL_URL);
  const loggedMeshNamesRef = useRef(false);

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

    if (DEBUG_TERRAIN_MESHES && !loggedMeshNamesRef.current) {
      const meshDebugRows = sorted.map(({ mesh, triangles }) => ({
        name: mesh.name || "(unnamed)",
        triangles: Math.round(triangles),
      }));

      console.table(meshDebugRows);
      if (typeof window !== "undefined") {
        window.__terrainMeshRows = meshDebugRows;
      }

      loggedMeshNamesRef.current = true;
    }

    const namedGroundCandidates = sorted.filter(({ mesh }) =>
      GROUND_NAME_PATTERN.test(mesh.name)
    );

    const groundMesh = (namedGroundCandidates[0] || sorted[0])?.mesh || null;

    const wallMeshes = sorted
      .filter(({ mesh }) => mesh !== groundMesh)
      .slice(0, MAX_WALL_COLLIDERS)
      .map(({ mesh }) => mesh);

    collidersRef.current = {
      ground: groundMesh ? [groundMesh] : [],
      walls: wallMeshes.length ? wallMeshes : groundMesh ? [groundMesh] : [],
    };

    return () => {
      collidersRef.current = {
        ground: [],
        walls: [],
      };
    };
  }, [scene, collidersRef]);

  return <primitive object={scene} frustumCulled />;
}

useGLTF.preload(TERRAIN_MODEL_URL);
