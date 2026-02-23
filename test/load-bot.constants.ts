import { config } from "@repo/shared";

const { GAME_CONFIG, NETWORK_CONFIG } = config;

export const URL = NETWORK_CONFIG.PROD_SERVER_URL;
export const DEV_URL = NETWORK_CONFIG.DEV_SERVER_URL;
export const BOTS = 20;
export const DURATION_MS = Infinity;
export const JOIN_DELAY_MS = 25;
export const MOVE_TICK_MS = GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;
export const BOT_SPEED = GAME_CONFIG.PLAYER_SPEED;
export const BOT_RADIUS = GAME_CONFIG.PLAYER_RADIUS;
export const START_DELAY_MS = 800;
export const MAX_X = GAME_CONFIG.GRID_COLS;
export const MAX_Y = GAME_CONFIG.GRID_ROWS;
export const ROOM_ID = "1";
export const START_GAME = true;
export const SOCKET_PATH = NETWORK_CONFIG.SOCKET_IO_PATH;
export const SOCKET_TRANSPORTS = [...NETWORK_CONFIG.SOCKET_TRANSPORTS];
