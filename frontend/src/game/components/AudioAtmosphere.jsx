import { useEffect, useRef } from "react";
import { useWorldStore } from "../state/worldStore";

const AUDIO_MAP = {
  cloudy: "/sound/forest.wav",
  mist: "/sound/seashore.wav",
  night: "/sound/ritual.wav"
};

export default function AudioAtmosphere() {
  const weatherId = useWorldStore((state) => state.world.weather);
  const audioRef = useRef(null);
  const activeSoundRef = useRef(null);

  useEffect(() => {
    const nextSound = AUDIO_MAP[weatherId] || null;

    if (activeSoundRef.current === nextSound) {
      return;
    }

    activeSoundRef.current = nextSound;

    if (!nextSound) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(AUDIO_MAP[nextSound]);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    } else {
      audioRef.current.src = AUDIO_MAP[nextSound];
    }

    audioRef.current.play().catch(() => {});
  }, [weatherId]);

  return null;
}
