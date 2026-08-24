/**
 * BombPlacementPolicy
 * 爆弾設置可否の判定とペイロード生成を提供する
 */
import { domain, type PlaceBombPayload } from "@repo/shared";
import { config } from "@server/config";
import type { BotPlayerId } from "../roster/BotRosterService.js";

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/** 爆弾設置可否を判定して設置時の情報を返す */
export const decideBombPlacement = (
  botPlayerId: BotPlayerId,
  elapsedMs: number,
  lastBombPlacedAtElapsedMs: number,
  bombSeq: number,
  x: number,
  y: number,
): {
  placeBombPayload: PlaceBombPayload | null;
  nextBombSeq: number;
  nextLastBombPlacedAtElapsedMs: number;
} => {
  const { BOMB_FUSE_MS } = config.GAME_CONFIG;

  // 人間プレイヤーと同じ共有ロジックでクールダウンを解決する
  const cooldownMs = domain.game.bomb.resolveBombCooldownMs(elapsedMs);
  const canPlaceBomb = elapsedMs - lastBombPlacedAtElapsedMs >= cooldownMs;

  if (
    !canPlaceBomb ||
    Math.random() >=
      clamp(config.BOT_AI_CONFIG.BOMB_PLACE_PROBABILITY_PER_TICK, 0, 1)
  ) {
    return {
      placeBombPayload: null,
      nextBombSeq: bombSeq,
      nextLastBombPlacedAtElapsedMs: lastBombPlacedAtElapsedMs,
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
    nextLastBombPlacedAtElapsedMs: elapsedMs,
  };
};
