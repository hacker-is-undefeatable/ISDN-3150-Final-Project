import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

export default function Door({ unlocked, onClick }) {
  const doorRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!doorRef.current) return;
    const targetRotation = unlocked ? -Math.PI / 2 : 0;
    doorRef.current.rotation.y +=
      (targetRotation - doorRef.current.rotation.y) * Math.min(1, delta * 3);
  });

  return (
    <group position={[2.6, 1.1, -4.8]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.2, 4.2, 0.15]} />
        <meshStandardMaterial color="#d7c4a4" />
      </mesh>

      <group ref={doorRef} position={[-0.9, 0.1, 0.08]}>
        <mesh
          position={[0.9, 0.9, 0]}
          castShadow
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => {
            event.stopPropagation();
            onClick("door");
          }}
        >
          <boxGeometry args={[1.8, 3.8, 0.1]} />
          <meshStandardMaterial
            color={hovered ? "#f9c87b" : "#8b5e3c"}
            emissive={hovered ? "#2a1a0a" : "#000000"}
          />
        </mesh>
      </group>
    </group>
  );
}
