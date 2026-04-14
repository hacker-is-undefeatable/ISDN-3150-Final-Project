import { useState } from "react";

export default function Safe({ opened, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={[-2.8, 0.8, -4.3]}>
      <mesh castShadow>
        <boxGeometry args={[2.2, 1.6, 1.2]} />
        <meshStandardMaterial color={hovered ? "#9caab5" : "#5a6772"} />
      </mesh>

      <mesh
        position={[0, 0, 0.62]}
        rotation={[opened ? -Math.PI / 3 : 0, 0, 0]}
        castShadow
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          onClick("safe");
        }}
      >
        <boxGeometry args={[2.2, 1.6, 0.1]} />
        <meshStandardMaterial color={hovered ? "#d0dde8" : "#8a98a3"} />
      </mesh>

      <mesh position={[0, 0, 0.68]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 32]} />
        <meshStandardMaterial color="#f1c76c" />
      </mesh>
    </group>
  );
}
