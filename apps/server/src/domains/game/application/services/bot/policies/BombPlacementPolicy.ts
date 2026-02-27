/**
 * BombPlacementPolicy
 * 爆弾設置可否の判定とペイロード生成を提供する
 */
import type { PlaceBombPayload } from "@repo/shared";
import { config } from "@server/config";
import type { BotPlayerId } from "../roster/BotRosterService.js";

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/** 爆弾設置可否を判定して設置時の情報を返す */
export const decideBombPlacement = (
  botPlayerId: BotPlayerId,
  nowMs: number,
  elapsedMs: number,
  lastBombPlacedAtMs: number,
  bombSeq: number,
  x: number,
  y: number,
): {
  placeBombPayload: PlaceBombPayload | null;
  nextBombSeq: number;
  nextLastBombPlacedAtMs: number;
} => {
  const { BOMB_COOLDOWN_MS, BOMB_FUSE_MS } = config.GAME_CONFIG;
  const canPlaceBomb = nowMs - lastBombPlacedAtMs >= BOMB_COOLDOWN_MS;

  if (
    !canPlaceBomb ||
    Math.random() >=
      clamp(config.BOT_AI_CONFIG.BOMB_PLACE_PROBABILITY_PER_TICK, 0, 1)
  ) {
    return {
      placeBombPayload: null,
      nextBombSeq: bombSeq,
      nextLastBombPlacedAtMs: lastBombPlacedAtMs,
    };
  }

  const nextBombSeq = bombSeq + 1;
  return {
    placeBombPayload: {
      requestId: `bot-${botPlayerId}-${nextBombSeq}`,
      x,
      y,
      explodeAtElapsedMs: elapsedMs + BOMB_FUSE_MS,
    },
    nextBombSeq,
    nextLastBombPlacedAtMs: nowMs,
  };
};
