import { config as sharedConfig } from "@repo/shared";

const CLIENT_GAME_CONFIG = {
  TIMER_DISPLAY_UPDATE_MS: 250,
  JOIN_REQUEST_TIMEOUT_MS: 8000,

  PLAYER_LERP_SMOOTHNESS: 18,
  PLAYER_LERP_SNAP_THRESHOLD: 0.005,

  GRID_CELL_SIZE: 100,

  TEAM_COLORS: ["#FF4B4B", "#4B4BFF", "#4BFF4B", "#FFD700"],

  MAP_BG_COLOR: 0x111111,
  MAP_GRID_COLOR: 0x333333,
  MAP_BORDER_COLOR: 0xff4444,
} as const;

const GAME_CONFIG = {
  ...sharedConfig.GAME_CONFIG,
  ...CLIENT_GAME_CONFIG,
  get MAP_WIDTH_PX(): number {
    return this.GRID_COLS * this.GRID_CELL_SIZE;
  },
  get MAP_HEIGHT_PX(): number {
    return this.GRID_ROWS * this.GRID_CELL_SIZE;
  },
  get PLAYER_RADIUS_PX(): number {
    return this.PLAYER_RADIUS * this.GRID_CELL_SIZE;
  },
} as const;

const NETWORK_CONFIG = {
  DEV_SERVER_HOST: "http://localhost",
  DEV_SERVER_PORT: 3000,
  get DEV_SERVER_URL() {
    return `${this.DEV_SERVER_HOST}:${this.DEV_SERVER_PORT}`;
  },
  PROD_SERVER_URL: "https://skillsemiwebgame.onrender.com",
  SOCKET_TRANSPORTS: ["websocket", "polling"],
  SOCKET_IO_PATH: sharedConfig.NETWORK_CONFIG.SOCKET_IO_PATH,
} as const;

export const config = {
  ...sharedConfig,
  GAME_CONFIG,
  NETWORK_CONFIG,
} as const;
