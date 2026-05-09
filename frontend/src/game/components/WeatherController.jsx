import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "../state/worldStore";
import { getWeatherPreset } from "../weather/WeatherManager";
import { lerp } from "../weather/WeatherTransition";

export default function WeatherController() {
  const weatherId = useWorldStore((state) => state.world.weather);
  const { scene } = useThree();

  const fogRef = useRef(new THREE.FogExp2("#000000", 0.02));
  const current = useRef({ density: 0.02, lightIntensity: 0.9 });
  const lastWeatherRef = useRef(null);

  const target = useMemo(() => getWeatherPreset(weatherId), [weatherId]);

  useFrame((state, delta) => {
    const speed = Math.min(delta * 0.4, 0.2);
    current.current.density = lerp(
      current.current.density,
      target.fogDensity,
      speed
    );

    current.current.lightIntensity = lerp(
      current.current.lightIntensity,
      target.fogDensity >= 0.05 ? 0.65 : 1.0,
      speed
    );

    fogRef.current.density = current.current.density;
    scene.fog = fogRef.current;
    scene.background = new THREE.Color(target.skyColor);

    const ambient = scene.getObjectByName("weather-ambient");
    const hemi = scene.getObjectByName("weather-hemi");
    const key = scene.getObjectByName("weather-key");
    const fill = scene.getObjectByName("weather-fill");

    if (ambient?.isLight) {
      ambient.color = new THREE.Color(target.ambientColor);
      ambient.intensity = 0.35 * current.current.lightIntensity;
    }

    if (hemi?.isLight) {
      hemi.color = new THREE.Color(target.lightColor);
      hemi.groundColor = new THREE.Color(target.ambientColor);
      hemi.intensity = 0.7 * current.current.lightIntensity;
    }

    if (key?.isLight) {
      key.color = new THREE.Color(target.lightColor);
      key.intensity = 1.1 * current.current.lightIntensity;
    }

    if (fill?.isLight) {
      fill.color = new THREE.Color(target.ambientColor);
      fill.intensity = 0.35 * current.current.lightIntensity;
    }

    if (lastWeatherRef.current !== weatherId) {
      lastWeatherRef.current = weatherId;
      console.info("[Weather] Transition", weatherId, target);
    }
  });

  return null;
}
