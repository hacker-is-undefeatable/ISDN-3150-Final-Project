import { useEffect, useMemo, useRef } from "react";
import { useWorldStore } from "../state/worldStore";
import { triggerEvent } from "../events/EventManager";

const noopContext = {
  spawnShip: () => {},
  spawnFog: () => {},
  spawnWatcher: () => {},
  spawnRitual: () => {},
  spawnGeneric: () => {}
};

export default function EventSpawner() {
  const activeEvents = useWorldStore((state) => state.world.activeEvents);
  const processed = useRef(new Set());

  const context = useMemo(() => noopContext, []);

  useEffect(() => {
    activeEvents.forEach((event) => {
      const key = `${event.id}-${event.startedAt}`;
      if (processed.current.has(key)) {
        return;
      }
      processed.current.add(key);
      const result = triggerEvent(
        { spawnEvent: event.id, location: event.location },
        context
      );
      console.info("[Event] Spawn", result);
    });
  }, [activeEvents, context]);

  return null;
}
