import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "../state/worldStore";
import { lerp } from "../weather/WeatherTransition";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const WEATHER_PRESETS = {
  cloudy: {
    fogDensity: 0.024,
    skyColor: "#5f6670",
    lightColor: "#c7d2de",
    ambientColor: "#86919d",
    exr: "/model/weather/cloudy.exr"
  },
  mist: {
    fogDensity: 0.06,
    skyColor: "#4a5058",
    lightColor: "#b9c7d8",
    ambientColor: "#6f7a86",
    exr: "/model/weather/mist.exr"
  },
  night: {
    fogDensity: 0.042,
    skyColor: "#121524",
    lightColor: "#8494c9",
    ambientColor: "#2d3556",
    exr: "/model/weather/night.exr"
  }
};

function getWeatherPreset(weatherId) {
  return WEATHER_PRESETS[weatherId] || WEATHER_PRESETS.cloudy;
}

export default function WeatherController() {
  const weatherId = useWorldStore((state) => state.world.weather);
  const ritualIntensity = useWorldStore((state) => Number(state.world.ritualIntensity) || 0);
  const supernaturalPulse = useWorldStore((state) => Number(state.world.supernaturalPulse) || 0);
  const { scene, gl } = useThree();

  const fogRef = useRef(new THREE.FogExp2("#000000", 0.02));
  const current = useRef({ density: 0.02, lightIntensity: 0.9, pulse: 0 });
  const envMapsRef = useRef({});
  const currentEnvKeyRef = useRef("");
  const lastWeatherRef = useRef(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const loader = new RGBELoader();
    let cancelled = false;

    const loadAll = async () => {
      const entries = Object.entries(WEATHER_PRESETS);
      await Promise.all(
        entries.map(async ([key, preset]) => {
          try {
            const texture = await loader.loadAsync(preset.exr);
            if (cancelled) {
              texture?.dispose?.();
              return;
            }
            if (!texture || !texture.isTexture) {
              console.warn(`[Weather] Invalid texture for ${key}`);
              envMapsRef.current[key] = null;
              return;
            }
            texture.mapping = THREE.EquirectangularReflectionMapping;
            const result = pmrem.fromEquirectangular(texture);
            if (!result || !result.texture) {
              console.warn(`[Weather] PMREM conversion failed for ${key}`);
              texture.dispose();
              envMapsRef.current[key] = null;
              return;
            }
            const envMap = result.texture;
            texture.dispose();
            envMapsRef.current[key] = envMap;
            console.info(`[Weather] Loaded environment map for ${key}`);
          } catch (error) {
            console.warn(`[Weather] Error loading ${key}:`, error?.message || error);
            envMapsRef.current[key] = null;
          }
        })
      );
    };

    void loadAll();

    return () => {
      cancelled = true;
      Object.values(envMapsRef.current).forEach((texture) => {
        if (texture?.isTexture) {
          texture.dispose();
        }
      });
      pmrem.dispose();
    };
  }, [gl]);

  useFrame((state, delta) => {
    const target = getWeatherPreset(weatherId);
    const speed = Math.min(delta * 0.4, 0.2);
    const pulseTarget = Math.min(2, supernaturalPulse + ritualIntensity * 0.25);

    current.current.pulse = lerp(current.current.pulse, pulseTarget, Math.min(delta * 1.2, 0.22));

    current.current.density = lerp(
      current.current.density,
      target.fogDensity + current.current.pulse * 0.016,
      speed
    );

    current.current.lightIntensity = lerp(
      current.current.lightIntensity,
      target.fogDensity >= 0.05 ? 0.58 : 0.92,
      speed
    );

    fogRef.current.density = current.current.density;
    fogRef.current.color = new THREE.Color(target.skyColor);
    scene.fog = fogRef.current;
    scene.background = new THREE.Color(target.skyColor);

    const envMap = envMapsRef.current[weatherId] || null;
    const envKey = envMap ? weatherId : "";
    if (currentEnvKeyRef.current !== envKey) {
      currentEnvKeyRef.current = envKey;
      scene.environment = envMap;
    }

    const ambient = scene.getObjectByName("weather-ambient");
    const hemi = scene.getObjectByName("weather-hemi");
    const key = scene.getObjectByName("weather-key");
    const fill = scene.getObjectByName("weather-fill");

    if (ambient?.isLight) {
      ambient.color = new THREE.Color(target.ambientColor);
      ambient.intensity = (0.3 + current.current.pulse * 0.08) * current.current.lightIntensity;
    }

    if (hemi?.isLight) {
      hemi.color = new THREE.Color(target.lightColor);
      hemi.groundColor = new THREE.Color(target.ambientColor);
      hemi.intensity = 0.64 * current.current.lightIntensity;
    }

    if (key?.isLight) {
      key.color = new THREE.Color(target.lightColor);
      key.intensity = (1.0 + current.current.pulse * 0.25) * current.current.lightIntensity;
    }

    if (fill?.isLight) {
      fill.color = new THREE.Color(target.ambientColor);
      fill.intensity = 0.3 * current.current.lightIntensity;
    }

    if (lastWeatherRef.current !== weatherId) {
      lastWeatherRef.current = weatherId;
      console.info("[Weather] Transition", weatherId, target);
    }
  });

  return null;
}
