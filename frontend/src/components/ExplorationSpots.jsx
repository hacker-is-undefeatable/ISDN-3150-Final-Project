import { useMemo } from "react";

export default function ExplorationSpots({
  spots,
  nearSpotId,
  completedSpotIds,
}) {
  const completedSet = useMemo(
    () => new Set(completedSpotIds || []),
    [completedSpotIds]
  );

  return (
    <group>
      {spots.map((spot) => {
        const isNear = nearSpotId === spot.id;
        const isCompleted = completedSet.has(spot.id);

        const color = isCompleted ? "#7be39c" : isNear ? "#ffd166" : "#79c8ff";
        const emissive = isCompleted ? "#2e8a4f" : isNear ? "#8d6510" : "#1d4f86";

        return (
          <group key={spot.id} position={spot.position}>
            <mesh position={[0, 0.36, 0]}>
              <sphereGeometry args={[0.24, 18, 18]} />
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={0.95}
                metalness={0.08}
                roughness={0.35}
              />
            </mesh>

            <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 0.72, 32]} />
              <meshBasicMaterial
                color={isCompleted ? "#8cf3ad" : "#f5fbff"}
                transparent
                opacity={0.7}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
