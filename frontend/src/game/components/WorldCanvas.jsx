import { Canvas } from "@react-three/fiber";

export default function WorldCanvas({ children }) {
  return (
    <Canvas shadows camera={{ position: [0, 6, 12], fov: 55 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 12, 4]} intensity={1.2} castShadow />
      {children}
    </Canvas>
  );
}
