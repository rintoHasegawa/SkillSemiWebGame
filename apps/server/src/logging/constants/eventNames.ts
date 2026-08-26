/**
 * eventNames
 * ログ出力で利用するイベント名定数群を提供する
 */
import { contracts as protocol } from "@repo/shared";

/** GameUseCaseログで利用するイベント名定数 */
export const gameUseCaseLogEvents = {
  PING: protocol.SocketEvents.PING,
  START_GAME: protocol.SocketEvents.START_GAME,
  READY_FOR_GAME: protocol.SocketEvents.READY_FOR_GAME,
  GAME_START: protocol.SocketEvents.GAME_START,
  GAME_END: protocol.SocketEvents.GAME_END,
  PLACE_BOMB: protocol.SocketEvents.PLACE_BOMB,
  BOMB_HIT_REPORT: protocol.SocketEvents.BOMB_HIT_REPORT,
  DISCONNECT: protocol.SocketEvents.DISCONNECT,
} as const;

/** RoomUseCaseログで利用するイベント名定数 */
export const roomUseCaseLogEvents = {
  JOIN_ROOM: protocol.SocketEvents.JOIN_ROOM,
  DISCONNECT: protocol.SocketEvents.DISCONNECT,
  ROOM_UPDATE: protocol.SocketEvents.ROOM_UPDATE,
  SELECT_TEAM: protocol.SocketEvents.SELECT_TEAM,
  LOBBY_SETTINGS_UPDATE: protocol.SocketEvents.LOBBY_SETTINGS_UPDATE,
  LEAVE_ROOM: protocol.SocketEvents.LEAVE_ROOM,
  RESUME_SESSION: protocol.SocketEvents.RESUME_SESSION,
} as const;

/** Gameドメインサービスとループログで利用するイベント名定数 */
export const gameDomainLogEvents = {
  MOVE: protocol.SocketEvents.MOVE,
  SESSION_START: "SESSION_START",
  PLAYER_MOVE: "PLAYER_MOVE",
  PLAYER_REMOVE: "PLAYER_REMOVE",
  PLAYER_RESUME: "PLAYER_RESUME",
  GAME_LOOP: "GAME_LOOP",
  PERF_STATS: "PERF_STATS",
} as const;

/** Roomドメインサービスログで利用するイベント名定数 */
export const roomDomainLogEvents = {
  ROOM_CREATE: "ROOM_CREATE",
  PLAYER_JOIN: "PLAYER_JOIN",
  PLAYER_LEAVE: "PLAYER_LEAVE",
  ROOM_DELETE: "ROOM_DELETE",
  OWNER_TRANSFER: "OWNER_TRANSFER",
  PLAYER_RESTORE: "PLAYER_RESTORE",
  LOBBY_SETTINGS_UPDATE: protocol.SocketEvents.LOBBY_SETTINGS_UPDATE,
} as const;

/** Networkスコープ固有ログで利用するイベント名定数 */
export const networkLogEvents = {
  CORS_ORIGIN_CHECK: "CORS_ORIGIN_CHECK",
  PROTOCOL_VERSION_CHECK: "PROTOCOL_VERSION_CHECK",
} as const;
