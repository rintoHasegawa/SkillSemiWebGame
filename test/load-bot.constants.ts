import { config as sharedConfig } from "@repo/shared";
import { config as clientConfig } from "../apps/client/src/config/index.ts";

const { GAME_CONFIG } = sharedConfig;
const { NETWORK_CONFIG } = clientConfig;

export const URL = NETWORK_CONFIG.PROD_SERVER_URL;
export const DEV_URL = NETWORK_CONFIG.DEV_SERVER_URL;
export const BOTS = 99;
export const DURATION_MS = Infinity;
export const JOIN_DELAY_MS = 25;
export const MOVE_TICK_MS = GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;
export const BOT_SPEED = GAME_CONFIG.PLAYER_SPEED;
export const BOT_RADIUS = GAME_CONFIG.PLAYER_RADIUS;
export const BOMB_COOLDOWN_MS = GAME_CONFIG.BOMB_COOLDOWN_MS;
export const BOMB_FUSE_MS = GAME_CONFIG.BOMB_FUSE_MS;
export const START_DELAY_MS = 800;
export const MAX_X = GAME_CONFIG.GRID_COLS;
export const MAX_Y = GAME_CONFIG.GRID_ROWS;
export const BOT_CAN_MOVE = true;
export const BOT_CAN_PLACE_BOMB = true;
export const ROOM_ID = "1";
export const START_GAME = true;
export const SOCKET_PATH = NETWORK_CONFIG.SOCKET_IO_PATH;
export const SOCKET_TRANSPORTS = [...NETWORK_CONFIG.SOCKET_TRANSPORTS];
