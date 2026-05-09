import { useEffect, useMemo, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { useRunStore } from "../state/runStore";

const EXTRACTION_RADIUS = 4.5;

export default function ExtractionManager({ playerCoords }) {
  const extractionTarget = useWorldStore((state) => state.world.extractionTarget);
  const setExtractionTarget = useWorldStore((state) => state.setExtractionTarget);
  const extractionAvailable = useRunStore((state) => state.extractionAvailable);
  const completeRun = useRunStore((state) => state.completeRun);

  const [promptVisible, setPromptVisible] = useState(false);

  const distance = useMemo(() => {
    if (!extractionTarget?.position || !playerCoords) return Number.POSITIVE_INFINITY;
    const dx = extractionTarget.position.x - playerCoords.x;
    const dy = extractionTarget.position.y - playerCoords.y;
    const dz = extractionTarget.position.z - playerCoords.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [extractionTarget, playerCoords]);

  useEffect(() => {
    if (!extractionAvailable) {
      setPromptVisible(false);
      return;
    }
    setPromptVisible(distance <= EXTRACTION_RADIUS);
  }, [extractionAvailable, distance]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "e") return;
      if (!promptVisible) return;
      event.preventDefault();
      completeRun("win");
      setExtractionTarget(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [promptVisible, completeRun, setExtractionTarget]);

  if (!extractionAvailable || !extractionTarget) {
    return null;
  }

  return (
    <div className="objective-prompt">Press E to extract</div>
  );
}
