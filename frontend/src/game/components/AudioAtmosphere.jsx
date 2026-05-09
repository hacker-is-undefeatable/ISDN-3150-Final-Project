import { useEffect, useRef } from "react";
import { useWorldStore } from "../state/worldStore";
import { getWeatherPreset } from "../weather/WeatherManager";

const AUDIO_MAP = {
  wind_soft: "/audio/wind_soft.mp3",
  fog_drone: "/audio/fog_drone.mp3",
  storm_rumble: "/audio/storm_rumble.mp3",
  blood_moon_chant: "/audio/blood_moon_chant.mp3",
  corruption_pulse: "/audio/corruption_pulse.mp3"
};

export default function AudioAtmosphere() {
  const weatherId = useWorldStore((state) => state.world.weather);
  const audioRef = useRef(null);
  const activeSoundRef = useRef(null);

  useEffect(() => {
    const preset = getWeatherPreset(weatherId);
    const nextSound = preset?.ambientSound || null;

    if (activeSoundRef.current === nextSound) {
      return;
    }

    activeSoundRef.current = nextSound;
    console.info("[Audio] Ambient", nextSound);

    if (!nextSound || !AUDIO_MAP[nextSound]) {
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
