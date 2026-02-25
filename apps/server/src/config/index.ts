import { config as sharedConfig } from "@repo/shared";

const GAME_CONFIG = {
  ...sharedConfig.GAME_CONFIG,
  MAX_PLAYERS_PER_ROOM: 100,
} as const;

const NETWORK_CONFIG = {
  DEV_SERVER_PORT: 3000,
  CORS_ORIGIN: "*",
  CORS_METHODS: ["GET", "POST"],
} as const;

export const config = {
  ...sharedConfig,
  GAME_CONFIG,
  NETWORK_CONFIG,
} as const;
