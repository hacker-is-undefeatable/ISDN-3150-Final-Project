import { useEffect, useRef, useState } from "react";
import { useNpcStore } from "../state/npcStore";
import { shiftLeft } from "three/src/nodes/TSL.js";

const EMPTY_HISTORY = [];
const EMPTY_STATE = {};

export default function DialoguePanel({ npcId, onSend }) {
  const isOpen = useNpcStore((state) => state.isDialogueOpen);
  const history = useNpcStore((state) => state.dialogueHistory[npcId] || EMPTY_HISTORY);
  const npcState = useNpcStore((state) => state.npcStates[npcId] || EMPTY_STATE);
  const isMinimized = useNpcStore((state) => (state.dialogueMinimized || {})[npcId] || false);
  const setDialogueMinimized = useNpcStore((state) => state.setDialogueMinimized);
  const toggleDialogueMinimized = useNpcStore((state) => state.toggleDialogueMinimized);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="dialogue-panel--minimized" onClick={() => setDialogueMinimized(npcId, false)} role="button" aria-label="Restore chat">
        <div className="dialogue-minimized-label">Click to Open Chat</div>
        <button className="dialogue-minimized-toggle" onClick={(e) => { e.stopPropagation(); toggleDialogueMinimized(npcId); }} aria-label="Toggle minimize">▾</button>
        <style>{`
          .dialogue-panel--minimized{position:fixed;right:18px;bottom:18px;background:rgba(0,0,0,0.6);color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px}
          .dialogue-minimized-label{font-weight:700}
          .dialogue-minimized-toggle{background:transparent;border:none;color:#fff;font-size:14px;cursor:pointer}
        `}</style>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const text = (input || "").trim();
    if (!text) return;
    setIsSending(true);
    setInput("");
    try {
      if (typeof onSend === "function") {
        await onSend(text);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="dialogue-panel" role="dialog" aria-live="polite">
      <div className="dialogue-header">
        <div className="dialogue-header-left">
          <span className="dialogue-title">NPC</span>
        </div>
        <div className="dialogue-header-right">
          <button
            type="button"
            className="dialogue-minimize-btn"
            onClick={() => setDialogueMinimized(npcId, true)}
            aria-label="Minimize chat"
          >
            <span className="dialogue-minimize-line" />
          </button>
          <span className="dialogue-meta">
            {npcState.emotion ? `Emotion: ${npcState.emotion}` : ""}
            {npcState.suspicion != null ? `  |  Suspicion: ${npcState.suspicion}` : ""}
          </span>
        </div>
      </div>

      <div className="dialogue-body" ref={bodyRef}>
        {history.map((entry, idx) => (
          <div key={idx} className={`dialogue-line ${entry.from === "player" ? "dialogue-line--player" : "dialogue-line--npc"}`}>
            <div className="dialogue-bubble">
              <div className="dialogue-label">{entry.from === "player" ? "You" : "Guide"}</div>
              <div className="dialogue-text">{entry.text}</div>
              <div className="dialogue-time">{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ""}</div>
            </div>
          </div>
        ))}
      </div>

      <form className="dialogue-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask the guide..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={isSending}
        />
        <button type="submit" className="dialogue-send-btn" disabled={isSending || !input.trim()}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
