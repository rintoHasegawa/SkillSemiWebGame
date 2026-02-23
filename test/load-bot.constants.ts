import { config } from "@repo/shared";

const { GAME_CONFIG, NETWORK_CONFIG } = config;

export const URL = NETWORK_CONFIG.PROD_SERVER_URL;
export const BOTS = 20;
export const DURATION_MS = 60_000;
export const JOIN_DELAY_MS = 25;
export const MOVE_INTERVAL_MS = 200;
export const START_DELAY_MS = 800;
export const MAX_X = GAME_CONFIG.MAP_WIDTH;
export const MAX_Y = GAME_CONFIG.MAP_HEIGHT;
export const ROOM_ID = "1";
export const START_GAME = true;
export const SOCKET_PATH = NETWORK_CONFIG.SOCKET_IO_PATH;
export const SOCKET_TRANSPORTS = [...NETWORK_CONFIG.SOCKET_TRANSPORTS];
