import WorldCanvas from "./WorldCanvas";
import EventSpawner from "./EventSpawner";
import WeatherController from "./WeatherController";
import AudioAtmosphere from "./AudioAtmosphere";
import RunOrchestrator from "./RunOrchestrator";

export default function GameRoot() {
  return (
    <div className="game-root">
      <WorldCanvas>
        <WeatherController />
        <EventSpawner />
        <AudioAtmosphere />
      </WorldCanvas>
      <RunOrchestrator />
    </div>
  );
}
