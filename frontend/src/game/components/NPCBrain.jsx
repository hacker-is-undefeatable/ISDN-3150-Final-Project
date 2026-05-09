import { useEffect, useState } from "react";
import { requestNpcDialogue } from "../ai/npcApi";
import { useWorldStore } from "../state/worldStore";

export default function NPCBrain({ npcId }) {
  const worldState = useWorldStore((state) => state.world);
  const [dialogue, setDialogue] = useState(null);

  useEffect(() => {
    let mounted = true;
    requestNpcDialogue(worldState, npcId, [], [])
      .then((response) => {
        if (mounted) {
          setDialogue(response.dialogue);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [npcId, worldState]);

  return dialogue ? <div className="npc-dialogue">{dialogue}</div> : null;
}
