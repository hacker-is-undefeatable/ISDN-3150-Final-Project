import { useEffect, useMemo, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { useRunStore } from "../state/runStore";
import { ALLOWED_CHARACTER_MODELS } from "../../lib/avatarModels";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { addRunHistory, addShards, getShardCount } from "../save/progressStore";
import RewardReveal from "./RewardReveal";
import RunSummaryScreen from "./RunSummaryScreen";

const MS_PER_SECOND = 1000;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function buildShardCatalog() {
  const entries = [];
  ALLOWED_CHARACTER_MODELS.forEach((model, index) => {
    const characterId = index + 1;
    for (let cardIndex = 0; cardIndex < 8; cardIndex += 1) {
      entries.push({
        shardKey: `${characterId}-${cardIndex}`,
        characterId,
        cardIndex,
        name: `${model.label} Card ${cardIndex + 1}`
      });
    }
  });
  return entries;
}

async function loadCardMap() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cards")
    .select("id, character_id, card_index, name")
    .order("character_id", { ascending: true })
    .order("card_index", { ascending: true });

  if (error || !data) return [];
  return data;
}

async function loadUserCardShards(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("user_cards")
    .select("card_id, shard_count, unlocked, unlocked_at")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data;
}

function buildMissingShardPool(cards, userCardMap) {
  const pool = [];
  cards.forEach((card) => {
    const current = userCardMap.get(card.id) || 0;
    const missing = Math.max(0, 4 - current);
    for (let i = 0; i < missing; i += 1) {
      pool.push(card);
    }
  });
  return pool;
}

function pickRandomShards(catalog, count) {
  const missingTokens = [];

  catalog.forEach((entry) => {
    const current = getShardCount(entry.shardKey);
    const missing = Math.max(0, 4 - current);
    for (let i = 0; i < missing; i += 1) {
      missingTokens.push(entry);
    }
  });

  if (!missingTokens.length) {
    return [];
  }

  for (let i = missingTokens.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [missingTokens[i], missingTokens[j]] = [missingTokens[j], missingTokens[i]];
  }

  return missingTokens.slice(0, count);
}

export default function RunOutcomeManager() {
  const world = useWorldStore((state) => state.world);
  const runPhase = useRunStore((state) => state.phase);
  const runStartTime = useRunStore((state) => state.runStartTime);
  const runEndTime = useRunStore((state) => state.runEndTime);
  const objectivesCompleted = useRunStore((state) => state.objectivesCompleted);
  const result = useRunStore((state) => state.result);
  const reward = useRunStore((state) => state.reward);
  const setReward = useRunStore((state) => state.setReward);
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);

  const shardCatalog = useMemo(() => buildShardCatalog(), []);

  useEffect(() => {
    if (runPhase !== "complete" || !result || summary) {
      return;
    }

    const durationMs = runEndTime && runStartTime ? runEndTime - runStartTime : 0;
    const summaryPayload = {
      objectivesCompleted,
      corruption: world.corruption,
      danger: world.dangerLevel,
      durationLabel: formatDuration(durationMs),
      result
    };

    setSummary(summaryPayload);
    addRunHistory({
      ...summaryPayload,
      durationMs,
      timestamp: new Date().toISOString()
    });

    if (!reward && result === "win") {
      const awardShards = async () => {
        if (supabase && user?.id) {
          const cards = await loadCardMap();
          const userCards = await loadUserCardShards(user.id);

          if (!cards.length) {
            throw new Error("Failed to load cards for shard rewards.");
          }

          const userCardMap = new Map(
            userCards.map((entry) => [entry.card_id, Number(entry.shard_count) || 0])
          );

          const missingPool = buildMissingShardPool(cards, userCardMap);
          if (!missingPool.length) {
            setReward({ type: "shards", total: 0, shards: [] });
            return;
          }

          for (let i = missingPool.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [missingPool[i], missingPool[j]] = [missingPool[j], missingPool[i]];
          }

          const picked = missingPool.slice(0, 5);
          const aggregated = new Map();

          picked.forEach((entry) => {
            const existing = aggregated.get(entry.id) || { ...entry, count: 0 };
            existing.count += 1;
            aggregated.set(entry.id, existing);
          });

          const updates = Array.from(aggregated.values()).map((entry) => {
            const current = userCardMap.get(entry.id) || 0;
            const nextCount = Math.min(4, current + entry.count);
            return {
              user_id: user.id,
              card_id: entry.id,
              shard_count: nextCount,
              unlocked: nextCount >= 4,
              unlocked_at: nextCount >= 4 ? new Date().toISOString() : null
            };
          });

          const { error: upsertError } = await supabase
            .from("user_cards")
            .upsert(updates, { onConflict: "user_id,card_id" });

          if (upsertError) {
            throw upsertError;
          }

          setReward({
            type: "shards",
            total: picked.length,
            shards: Array.from(aggregated.values()).map((entry) => ({
              shardKey: entry.id,
              name: entry.name,
              count: entry.count
            }))
          });
          return;
        }

        const picked = pickRandomShards(shardCatalog, 5);
        const shardKeys = picked.map((entry) => entry.shardKey);
        addShards(shardKeys, 4);

        const aggregated = new Map();
        picked.forEach((entry) => {
          const existing = aggregated.get(entry.shardKey) || { ...entry, count: 0 };
          existing.count += 1;
          aggregated.set(entry.shardKey, existing);
        });

        setReward({
          type: "shards",
          total: shardKeys.length,
          shards: Array.from(aggregated.values())
        });
      };

      void awardShards().catch((error) => {
        console.warn("Shard reward failed, falling back to local storage.", error);
        const picked = pickRandomShards(shardCatalog, 5);
        const shardKeys = picked.map((entry) => entry.shardKey);
        addShards(shardKeys, 4);

        const aggregated = new Map();
        picked.forEach((entry) => {
          const existing = aggregated.get(entry.shardKey) || { ...entry, count: 0 };
          existing.count += 1;
          aggregated.set(entry.shardKey, existing);
        });

        setReward({
          type: "shards",
          total: shardKeys.length,
          shards: Array.from(aggregated.values())
        });
      });
    }
  }, [
    runPhase,
    result,
    summary,
    world,
    objectivesCompleted,
    runEndTime,
    runStartTime,
    reward,
    setReward,
    shardCatalog,
    user
  ]);

  if (runPhase !== "complete") {
    return null;
  }

  return (
    <>
      <RunSummaryScreen summary={summary} />
      <RewardReveal reward={reward} />
    </>
  );
}
