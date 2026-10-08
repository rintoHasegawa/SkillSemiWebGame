import { config as sharedConfig } from "@repo/shared";
import { resolveGameDurationOverride } from "./gameDurationOverride";

/** 起動時に解決した試合時間の上書き設定（起動ログの出力に使う） */
export const gameDurationOverride = resolveGameDurationOverride();

const GAME_CONFIG = {
  ...sharedConfig.GAME_CONFIG,
  // 開発モード限定の上書きを反映した試合時間（本番・未設定時は shared の既定値）
  GAME_DURATION_SEC: gameDurationOverride.gameDurationSec,
  // 目標人数の選択肢生成（shared の targetPlayerCount）が上限超過しない前提として 4 の倍数を維持する
  MAX_PLAYERS_PER_ROOM: 100,
} as const;

const NETWORK_CONFIG = {
  DEV_SERVER_PORT: 3000,
  CORS_METHODS: ["GET", "POST"],
} as const;

const BOT_AI_CONFIG = {
  BOMB_PLACE_PROBABILITY_PER_TICK: 0.06,
  UNPAINTED_PRIORITY_STRENGTH: 1,
  MOVE_SMOOTHNESS: 1,
  TARGET_REACHED_EPSILON: 0.15,
} as const;

export const config = {
  ...sharedConfig,
  GAME_CONFIG,
  NETWORK_CONFIG,
  BOT_AI_CONFIG,
} as const;

/**
 * GAME_START ペイロードへ載せる試合時間フィールドを返す
 * 上書きを適用した場合のみ値を載せ，既定値のとき（本番を含む）はペイロードを変えない
 */
export const buildGameDurationPayloadField = (): { gameDurationSec?: number } => {
  return gameDurationOverride.status === "applied"
    ? { gameDurationSec: gameDurationOverride.gameDurationSec }
    : {};
};
