import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
// TopBar removed per request
import NavBar from "../components/NavBar";
import SceneSelector from "../components/SceneSelector";
import CharacterSelector from "../components/CharacterSelector";
import CardGrid from "../components/CardGrid";
import StatsPanel from "../components/StatsPanel";

function makeMockCharacters() {
  return Array.from({ length: 11 }).map((_, i) => ({
    id: `char_${String(i).padStart(2, "0")}`,
    unlocked: i % 3 !== 0, // some locked
    cards: Array.from({ length: 8 }).map((__, j) => j < (i % 5)),
  }));
}

export default function Game() {
  const navigate = useNavigate();
  const characters = useMemo(() => makeMockCharacters(), []);

  const [selectedScene, setSelectedScene] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedTab, setSelectedTab] = useState("Play");

  const currentCharacter = characters.find((c) => c.id === selectedCharacter) || null;

  const collectedCount = currentCharacter ? currentCharacter.cards.filter(Boolean).length : 0;

  const stats = {
    cardsUnlocked: characters.reduce((acc, c) => acc + c.cards.filter(Boolean).length, 0),
    runsPlayed: 12,
    bestScore: 9876,
  };

  const handleEnter = () => {
    if (!selectedScene) return;
    navigate("/play", { state: { scene: selectedScene, character: selectedCharacter } });
  };

  return (
    <div className="lobby-root">
      <NavBar selected={selectedTab} onChange={setSelectedTab} />

      <main className="lobby-main">
        {selectedTab === "Play" && (
          <section className="lobby-section">
            <h2 className="lobby-heading">Choose Your Scene</h2>
            <SceneSelector selectedScene={selectedScene} onSelect={setSelectedScene} />

            <div style={{ marginTop: 18 }}>
              <button onClick={handleEnter} disabled={!selectedScene} className="enter-button">
                ENTER ESCAPE ROOM
              </button>
            </div>
          </section>
        )}

        {selectedTab === "Characters" && (
          <section>
            <h2 className="lobby-heading">Characters</h2>
            <CharacterSelector
              characters={characters}
              selectedCharacter={selectedCharacter}
              onSelect={(id) => {
                const c = characters.find((x) => x.id === id);
                if (!c || !c.unlocked) return;
                setSelectedCharacter(id);
              }}
            />

            <div className="lobby-collection" style={{ marginTop: 16 }}>
              <h4 className="lobby-small">Card Collection</h4>
              {currentCharacter ? (
                <>
                  <p className="lobby-collection__progress">{`${collectedCount} / 8 cards collected`}</p>
                  <CardGrid cards={currentCharacter.cards} />
                </>
              ) : (
                <p className="lobby-empty">Select a character to view card progress.</p>
              )}
            </div>
          </section>
        )}

        {selectedTab === "Card" && (
          <section>
            <h2 className="lobby-heading">All Cards</h2>
            <div className="lobby-small" style={{ marginBottom: 8 }}>All collected cards across characters (mock)</div>
            <div className="collection-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={`collection-card ${i % 3 === 0 ? "collection-card--unlocked" : ""}`}>
                  {i % 3 === 0 ? `Card ${i + 1}` : `Locked`}
                </div>
              ))}
            </div>
          </section>
        )}

        {selectedTab === "Backpack" && (
          <section>
            <h2 className="lobby-heading">Backpack</h2>
            <p className="lobby-small">Your inventory is empty (mock).</p>
          </section>
        )}

        {selectedTab === "Shop" && (
          <section>
            <h2 className="lobby-heading">Shop</h2>
            <p className="lobby-small">Shop coming soon. Use mock currency to buy cosmetics.</p>
          </section>
        )}

        {selectedTab === "Setting" && (
          <section>
            <h2 className="lobby-heading">Settings</h2>
            <p className="lobby-small">Account and preferences (mock).</p>
          </section>
        )}
      </main>
    </div>
  );
}
