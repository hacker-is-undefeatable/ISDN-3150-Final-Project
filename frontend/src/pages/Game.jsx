import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
// TopBar removed per request
import NavBar from "../components/NavBar";
import ModelPreview from "../components/ModelPreview";
import CharacterGrid from "../components/CharacterGrid";
import { ALLOWED_CHARACTER_MODELS, DEFAULT_CHARACTER_MODEL } from "../lib/avatarModels";
import SceneSelector from "../components/SceneSelector";
import CardGrid from "../components/CardGrid";
import StatsPanel from "../components/StatsPanel";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Game() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [characters, setCharacters] = useState([]);
  const [cards, setCards] = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [charactersError, setCharactersError] = useState("");

  const [selectedScene, setSelectedScene] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(ALLOWED_CHARACTER_MODELS[0].code);
  const [selectedTab, setSelectedTab] = useState("Play");
  const [selectedCardDetail, setSelectedCardDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCharacters = async () => {
      if (!supabase || !isAuthenticated || !user?.id) {
        if (!isMounted) return;
        setCharacters(
          ALLOWED_CHARACTER_MODELS.map((model, index) => ({
            id: index + 1,
            code: model.code,
            label: model.label,
            name: model.label,
            description: "",
            model_path: `/model/${model.code}.vrm`,
            image_path: `/character-img/character-img-${model.code.replace("model", "")}.png`,
            unlocked: model.code === DEFAULT_CHARACTER_MODEL,
          }))
        );
        setCards(
          ALLOWED_CHARACTER_MODELS.flatMap((model, index) =>
            Array.from({ length: 8 }).map((_, cardIndex) => ({
              id: `${index + 1}-${cardIndex}`,
              character_id: index + 1,
              card_index: cardIndex,
              name: `${model.label} Card ${cardIndex + 1}`,
              image_path: `/card-img/${index + 1}/card${cardIndex + 1}.png`,
              unlocked: false,
            }))
          )
        );
        setCharactersLoading(false);
        return;
      }

      setCharactersLoading(true);
      setCharactersError("");

      const [
        { data: characterRows, error: characterError },
        { data: unlockRows, error: unlockError },
        { data: cardRows, error: cardError },
        { data: userCardRows, error: userCardError },
      ] = await Promise.all([
        supabase.from("characters").select("id, name, description, model_path, image_path").order("id", { ascending: true }),
        supabase.from("user_characters").select("character_id, unlocked").eq("user_id", user.id),
        supabase.from("cards").select("id, character_id, card_index, name").order("character_id", { ascending: true }).order("card_index", { ascending: true }),
        supabase.from("user_cards").select("card_id, unlocked").eq("user_id", user.id),
      ]);

      if (!isMounted) return;

      if (characterError) {
        setCharactersError(characterError.message);
        setCharacters([]);
        setCharactersLoading(false);
        return;
      }

      if (unlockError) {
        setCharactersError(unlockError.message);
        setCharacters([]);
        setCards([]);
        setCharactersLoading(false);
        return;
      }

      if (cardError) {
        setCharactersError(cardError.message);
        setCharacters([]);
        setCards([]);
        setCharactersLoading(false);
        return;
      }

      if (userCardError) {
        setCharactersError(userCardError.message);
        setCharacters([]);
        setCards([]);
        setCharactersLoading(false);
        return;
      }

      const unlockMap = new Map((unlockRows || []).map((row) => [row.character_id, Boolean(row.unlocked)]));
      const cardUnlockMap = new Map((userCardRows || []).map((row) => [row.card_id, Boolean(row.unlocked)]));
      const merged = (characterRows || []).map((row) => ({
        ...row,
        code: row.model_path?.replace("/model/", "")?.replace(".vrm", "") || `model${String(row.id - 1).padStart(5, "0")}`,
        label: row.name,
        unlocked: row.id === 11 || unlockMap.get(row.id) || false,
      }));

      const mergedCards = (cardRows || []).map((row) => ({
        ...row,
        image_path: `/card-img/${row.character_id}/card${row.card_index + 1}.png`,
        unlocked: cardUnlockMap.get(row.id) || false,
      }));

      setCharacters(merged);
      setCards(mergedCards);
      setCharactersLoading(false);
    };

    void loadCharacters();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!characters.length) return;

    const unlockedDefault = characters.find((c) => c.unlocked);
    const fallback = characters[0];
    const selected = characters.find((c) => c.code === selectedCharacter);
    const preferred = unlockedDefault || fallback;

    if (!selected?.unlocked && preferred?.code && preferred.code !== selectedCharacter) {
      setSelectedCharacter(preferred.code);
    }
  }, [characters, selectedCharacter]);

  const currentCharacter = characters.find((c) => c.code === selectedCharacter) || null;
  const canUseCurrentCharacter = Boolean(currentCharacter?.unlocked);

  const cardCollections = useMemo(() => {
    const cardsByCharacter = new Map();
    const hiddenCardCharacters = new Set(["yara quinn"]);

    cards.forEach((card) => {
      const existing = cardsByCharacter.get(card.character_id) || Array.from({ length: 8 });
      existing[card.card_index] = card;
      cardsByCharacter.set(card.character_id, existing);
    });

    return characters
      .filter((character) => {
        const label = (character.label || character.name || "").trim().toLowerCase();
        return !hiddenCardCharacters.has(label);
      })
      .map((character) => {
      const characterCards = Array.from({ length: 8 }, (_, cardIndex) => {
        const existing = cardsByCharacter.get(character.id)?.[cardIndex];

        return (
          existing || {
            id: `${character.id}-${cardIndex}`,
            character_id: character.id,
            card_index: cardIndex,
            name: `${character.label || character.name} Card ${cardIndex + 1}`,
            image_path: `/card-img/${character.id}/card${cardIndex + 1}.png`,
            unlocked: false,
          }
        );
      });

      return {
        character,
        cards: characterCards,
        collectedCount: characterCards.filter((card) => card.unlocked).length,
      };
    });
  }, [characters, cards]);

  const collectedCount = characters.filter((c) => c.unlocked).length;

  const stats = {
    cardsUnlocked: characters.filter((c) => c.unlocked).length,
    runsPlayed: 12,
    bestScore: 9876,
  };

  const handleCardSelect = (card, character, cardNumber) => {
    setSelectedCardDetail({ card, character, cardNumber });
  };

  const closeCardDetail = () => {
    setSelectedCardDetail(null);
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
          <section className="character-selection">
            <div className="character-selection__left">
              <h2 className="lobby-heading">Characters</h2>
              {charactersLoading ? (
                <p className="lobby-small">Loading unlocked characters...</p>
              ) : charactersError ? (
                <p className="lobby-small">{charactersError}</p>
              ) : (
                <CharacterGrid
                  characters={characters}
                  selected={selectedCharacter}
                  onSelect={(modelCode) => {
                    const c = characters.find((x) => x.code === modelCode);
                    if (!c || !c.unlocked) return;
                    setSelectedCharacter(modelCode);
                  }}
                />
              )}
            </div>

            <div className="character-selection__right">
              <div className="character-preview-container">
                <ModelPreview avatarModelPath={`/model/${selectedCharacter}.vrm`} />
              </div>
              <div className="character-description">
                <div className="character-description__header">
                  <h3 className="character-description__title">
                    {currentCharacter?.label || "Select a Character"}
                  </h3>
                  <button
                    className="character-description__use-button"
                    onClick={() => setSelectedTab("Play")}
                    disabled={!canUseCurrentCharacter}
                    title={canUseCurrentCharacter ? "Use this character in Play mode" : "You can only use owned characters"}
                  >
                    Use
                  </button>
                </div>
                <p className="character-description__text">{currentCharacter?.description || ""}</p>
              </div>
            </div>
          </section>
        )}

        {selectedTab === "Card" && (
          <section className="card-collection-page">
            <h2 className="lobby-heading">All Cards</h2>
            <div className="lobby-small" style={{ marginBottom: 8 }}>
              Collect all 8 cards from a character to unlock them.
            </div>
            {charactersLoading ? (
              <p className="lobby-small">Loading cards...</p>
            ) : charactersError ? (
              <p className="lobby-small">{charactersError}</p>
            ) : (
              <div className="card-collection-list">
                {cardCollections.map(({ character, cards: characterCards, collectedCount }) => (
                  <CardGrid
                    key={character.code}
                    character={character}
                    cards={characterCards}
                    collectedCount={collectedCount}
                    onCardSelect={handleCardSelect}
                  />
                ))}
              </div>
            )}
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

      {selectedCardDetail && (
        <div className="card-detail-overlay" onClick={closeCardDetail} role="presentation">
          <div className="card-detail" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="card-detail__media">
              {selectedCardDetail.card.image_path || selectedCardDetail.card.image || selectedCardDetail.card.thumbnail ? (
                <img
                  src={selectedCardDetail.card.image_path || selectedCardDetail.card.image || selectedCardDetail.card.thumbnail}
                  alt={selectedCardDetail.card.name || `Card ${selectedCardDetail.cardNumber}`}
                  className={`card-detail__image ${selectedCardDetail.card.unlocked ? "" : "card-detail__image--locked"}`}
                />
              ) : (
                <div className={`card-detail__image-fallback ${selectedCardDetail.card.unlocked ? "" : "card-detail__image--locked"}`}>
                  Card {selectedCardDetail.cardNumber}
                </div>
              )}
            </div>
            <div className="card-detail__info">
              <div className="card-detail__header">
                <div>
                  <p className="card-detail__eyebrow">Reward Preview</p>
                  <h3 className="card-detail__title">
                    {selectedCardDetail.card.name || `Card ${selectedCardDetail.cardNumber}`}
                  </h3>
                </div>
                <button type="button" className="card-detail__close" onClick={closeCardDetail} aria-label="Close">
                  &#10005;
                </button>
              </div>
              <p className="card-detail__description">
                {selectedCardDetail.card.description ||
                  `A collectible reward card from ${selectedCardDetail.character?.label || selectedCardDetail.character?.name || "this character"}.`}
              </p>
              <div className="card-detail__requirements">
                <span>Unlock requirements</span>
                <p>
                  {selectedCardDetail.card.unlocked
                    ? "Unlocked"
                    : `Collect this card by completing runs with ${selectedCardDetail.character?.label || selectedCardDetail.character?.name || "this character"}.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
