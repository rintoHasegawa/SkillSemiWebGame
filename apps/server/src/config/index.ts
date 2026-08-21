import { config as sharedConfig } from "@repo/shared";

const sharedGameConfig =
  sharedConfig.GAME_CONFIG as typeof sharedConfig.GAME_CONFIG & {
    GAME_START_DELAY_MS?: number;
  };

const GAME_CONFIG = {
  ...sharedGameConfig,
  GAME_START_DELAY_MS: sharedGameConfig.GAME_START_DELAY_MS ?? 5000,
  // 目標人数の選択肢生成（shared の targetPlayerCount）が上限超過しない前提として 4 の倍数を維持する
  MAX_PLAYERS_PER_ROOM: 100,
} as const;

const NETWORK_CONFIG = {
  DEV_SERVER_PORT: 3000,
  CORS_ORIGIN: "*",
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
