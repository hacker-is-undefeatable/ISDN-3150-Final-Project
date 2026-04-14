import Door from "./Door";
import Safe from "./Safe";

function Painting({ onClick }) {
  return (
    <group
      position={[0, 2.2, -4.85]}
      onClick={(event) => {
        event.stopPropagation();
        onClick("painting");
      }}
    >
      <mesh>
        <boxGeometry args={[2.2, 1.4, 0.05]} />
        <meshStandardMaterial color="#4d342c" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1.9, 1.1]} />
        <meshStandardMaterial color="#b07d3c" />
      </mesh>
    </group>
  );
}

function RoomShell() {
  return (
    <group>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[10, 0.2, 10]} />
        <meshStandardMaterial color="#2d3f3b" />
      </mesh>

      <mesh position={[0, 2.5, -5]}>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color="#e9d9c8" />
      </mesh>

      <mesh position={[-5, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, 10]} />
        <meshStandardMaterial color="#e1cfbd" />
      </mesh>

      <mesh position={[5, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, 10]} />
        <meshStandardMaterial color="#e1cfbd" />
      </mesh>

      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[10, 0.2, 10]} />
        <meshStandardMaterial color="#d4c3b2" />
      </mesh>
    </group>
  );
}

export default function Room({ doorUnlocked, safeOpened, onObjectClick }) {
  return (
    <group>
      <RoomShell />
      <Door unlocked={doorUnlocked} onClick={onObjectClick} />
      <Safe opened={safeOpened} onClick={onObjectClick} />
      <Painting onClick={onObjectClick} />
    </group>
  );
}
