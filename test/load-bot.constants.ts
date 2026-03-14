import { config as sharedConfig } from "@repo/shared";

const { GAME_CONFIG, NETWORK_CONFIG } = sharedConfig;

const DEFAULT_SERVER_HOST = "http://localhost";
const DEFAULT_SERVER_PORT = "3000";
const DEFAULT_SERVER_URL = `${DEFAULT_SERVER_HOST}:${DEFAULT_SERVER_PORT}`;
export const URL = process.env.LOAD_TEST_SERVER_URL || DEFAULT_SERVER_URL;
export const DEV_URL = process.env.LOAD_TEST_DEV_SERVER_URL || DEFAULT_SERVER_URL;
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
export const SOCKET_TRANSPORTS = ["websocket", "polling"];
