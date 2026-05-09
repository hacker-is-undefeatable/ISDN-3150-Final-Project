import { useEffect, useRef, useState } from "react";
import { useNpcStore } from "../state/npcStore";

const EMPTY_HISTORY = [];
const EMPTY_STATE = {};

export default function DialoguePanel({ npcId }) {
  const isOpen = useNpcStore((state) => state.isDialogueOpen);
  const history = useNpcStore(
    (state) => state.dialogueHistory[npcId] || EMPTY_HISTORY
  );
  const npcState = useNpcStore(
    (state) => state.npcStates[npcId] || EMPTY_STATE
  );

  const latest = history[history.length - 1];
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const lastTextRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!latest?.text || lastTextRef.current === latest.text) {
      return;
    }

    lastTextRef.current = latest.text;

    let index = 0;
    setDisplayText("");
    setIsTyping(true);

    const timer = window.setInterval(() => {
      index += 1;
      setDisplayText(latest.text.slice(0, index));
      if (index >= latest.text.length) {
        window.clearInterval(timer);
        setIsTyping(false);
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [isOpen, latest?.text]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialogue-panel" role="dialog" aria-live="polite">
      <div className="dialogue-header">
        <span className="dialogue-title">NPC</span>
        <span className="dialogue-meta">
          {npcState.emotion ? `Emotion: ${npcState.emotion}` : ""}
          {npcState.suspicion != null ? `  |  Suspicion: ${npcState.suspicion}` : ""}
        </span>
      </div>
      <div className="dialogue-body">
        {displayText || latest?.text || "..."}
        {isTyping && <span className="typing-cursor">|</span>}
      </div>
      {latest?.timestamp && (
        <div className="dialogue-footer">
          {new Date(latest.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
