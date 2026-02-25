/**
 * logEvents
 * アプリケーションログで利用するイベント名定数を提供する
 */
import { protocol } from "@repo/shared";

/** ログ出力で利用するスコープ名の共通定数 */
export const logScopes = {
  NETWORK: "Network",
  GAME_USE_CASE: "GameUseCase",
  ROOM_USE_CASE: "RoomUseCase",
  GAME_LOOP: "GameLoop",
  GAME_ROOM_SESSION: "GameRoomSession",
  GAME_PLAYER_OPERATION_SERVICE: "GamePlayerOperationService",
  GAME_SESSION_LIFECYCLE_SERVICE: "GameSessionLifecycleService",
  ROOM_JOIN_SERVICE: "RoomJoinService",
  ROOM_EXIT_SERVICE: "RoomExitService",
} as const;

/** ログ出力で利用するスコープ名型 */
export type LogScope = (typeof logScopes)[keyof typeof logScopes];

type ValueOf<T> = T[keyof T];

/** Networkスコープで利用可能なイベント名型 */
export type NetworkLogEvent = ValueOf<typeof protocol.SocketEvents>;

/** Networkスコープで利用可能な結果値型 */
export type NetworkLogResult =
  | "connected"
  | "disconnected"
  | "rejected_room_full"
  | "rejected_duplicate"
  | "ignored_invalid_payload";

/** GameUseCaseスコープで利用可能なイベント名型 */
export type GameUseCaseLogEvent =
  | "start-game"
  | "ready-for-game"
  | "game-start"
  | "game-end"
  | "disconnect";

/** GameUseCaseスコープで利用可能な結果値型 */
export type GameUseCaseLogResult =
  | "ignored_no_room"
  | "ignored_already_playing"
  | "ignored_room_not_found"
  | "ignored_missing_room"
  | "accepted"
  | "received"
  | "emitted"
  | "player_removed";

/** RoomUseCaseスコープで利用可能なイベント名型 */
export type RoomUseCaseLogEvent =
  | "join-room"
  | "disconnect"
  | "room-update";

/** RoomUseCaseスコープで利用可能な結果値型 */
export type RoomUseCaseLogResult =
  | "received"
  | "rejected"
  | "processed"
  | "emitted";

/** GameLoopスコープで利用可能なイベント名型 */
export type GameLoopLogEvent = "GAME_LOOP";

/** GameLoopスコープで利用可能な結果値型 */
export type GameLoopLogResult =
  | "started"
  | "stopped";

/** GameRoomSessionスコープで利用可能なイベント名型 */
export type GameRoomSessionLogEvent = "move";

/** GameRoomSessionスコープで利用可能な結果値型 */
export type GameRoomSessionLogResult =
  | "ignored_player_not_found"
  | "ignored_invalid_payload";

/** GamePlayerOperationServiceスコープで利用可能なイベント名型 */
export type GamePlayerOperationServiceLogEvent =
  | "PLAYER_MOVE"
  | "PLAYER_REMOVE";

/** GamePlayerOperationServiceスコープで利用可能な結果値型 */
export type GamePlayerOperationServiceLogResult =
  | "ignored_player_not_in_session"
  | "session_disposed_empty_room";

/** GameSessionLifecycleServiceスコープで利用可能なイベント名型 */
export type GameSessionLifecycleServiceLogEvent = "SESSION_START";

/** GameSessionLifecycleServiceスコープで利用可能な結果値型 */
export type GameSessionLifecycleServiceLogResult =
  | "ignored_already_running"
  | "started";

/** RoomJoinServiceスコープで利用可能なイベント名型 */
export type RoomJoinServiceLogEvent =
  | "ROOM_CREATE"
  | "PLAYER_JOIN";

/** RoomJoinServiceスコープで利用可能な結果値型 */
export type RoomJoinServiceLogResult =
  | "created"
  | "ignored_duplicate"
  | "ignored_room_full"
  | "joined";

/** RoomExitServiceスコープで利用可能なイベント名型 */
export type RoomExitServiceLogEvent =
  | "PLAYER_LEAVE"
  | "ROOM_DELETE"
  | "OWNER_TRANSFER";

/** RoomExitServiceスコープで利用可能な結果値型 */
export type RoomExitServiceLogResult =
  | "removed"
  | "deleted"
  | "transferred";

/** スコープごとの event/result 型契約 */
export type LogPayloadByScope = {
  [logScopes.NETWORK]: {
    event: NetworkLogEvent;
    result: NetworkLogResult;
  };
  [logScopes.GAME_USE_CASE]: {
    event: GameUseCaseLogEvent;
    result: GameUseCaseLogResult;
  };
  [logScopes.ROOM_USE_CASE]: {
    event: RoomUseCaseLogEvent;
    result: RoomUseCaseLogResult;
  };
  [logScopes.GAME_LOOP]: {
    event: GameLoopLogEvent;
    result: GameLoopLogResult;
  };
  [logScopes.GAME_ROOM_SESSION]: {
    event: GameRoomSessionLogEvent;
    result: GameRoomSessionLogResult;
  };
  [logScopes.GAME_PLAYER_OPERATION_SERVICE]: {
    event: GamePlayerOperationServiceLogEvent;
    result: GamePlayerOperationServiceLogResult;
  };
  [logScopes.GAME_SESSION_LIFECYCLE_SERVICE]: {
    event: GameSessionLifecycleServiceLogEvent;
    result: GameSessionLifecycleServiceLogResult;
  };
  [logScopes.ROOM_JOIN_SERVICE]: {
    event: RoomJoinServiceLogEvent;
    result: RoomJoinServiceLogResult;
  };
  [logScopes.ROOM_EXIT_SERVICE]: {
    event: RoomExitServiceLogEvent;
    result: RoomExitServiceLogResult;
  };
};

/** スコープごとの必須追加フィールド型契約 */
export type LogRequiredFieldsByScope = {
  [logScopes.NETWORK]: {
    socketId: string;
  };
  [logScopes.GAME_USE_CASE]: {
    socketId?: string;
    roomId?: string;
  };
  [logScopes.ROOM_USE_CASE]: {
    socketId: string;
    roomId?: string;
  };
  [logScopes.GAME_LOOP]: {
    roomId: string;
  };
  [logScopes.GAME_ROOM_SESSION]: {
    roomId: string;
    socketId: string;
  };
  [logScopes.GAME_PLAYER_OPERATION_SERVICE]: {
    socketId: string;
    roomId?: string;
  };
  [logScopes.GAME_SESSION_LIFECYCLE_SERVICE]: {
    roomId: string;
  };
  [logScopes.ROOM_JOIN_SERVICE]: {
    roomId: string;
    socketId: string;
  };
  [logScopes.ROOM_EXIT_SERVICE]: {
    roomId: string;
    socketId: string;
  };
};

/** GameUseCaseログで利用するイベント名定数 */
export const gameUseCaseLogEvents = {
  START_GAME: protocol.SocketEvents.START_GAME,
  READY_FOR_GAME: protocol.SocketEvents.READY_FOR_GAME,
  GAME_START: protocol.SocketEvents.GAME_START,
  GAME_END: protocol.SocketEvents.GAME_END,
  DISCONNECT: protocol.SocketEvents.DISCONNECT,
} as const;

/** RoomUseCaseログで利用するイベント名定数 */
export const roomUseCaseLogEvents = {
  JOIN_ROOM: protocol.SocketEvents.JOIN_ROOM,
  DISCONNECT: protocol.SocketEvents.DISCONNECT,
  ROOM_UPDATE: protocol.SocketEvents.ROOM_UPDATE,
} as const;

/** Gameドメインサービスとループログで利用するイベント名定数 */
export const gameDomainLogEvents = {
  MOVE: protocol.SocketEvents.MOVE,
  SESSION_START: "SESSION_START",
  PLAYER_MOVE: "PLAYER_MOVE",
  PLAYER_REMOVE: "PLAYER_REMOVE",
  GAME_LOOP: "GAME_LOOP",
} as const;

/** Roomドメインサービスログで利用するイベント名定数 */
export const roomDomainLogEvents = {
  ROOM_CREATE: "ROOM_CREATE",
  PLAYER_JOIN: "PLAYER_JOIN",
  PLAYER_LEAVE: "PLAYER_LEAVE",
  ROOM_DELETE: "ROOM_DELETE",
  OWNER_TRANSFER: "OWNER_TRANSFER",
} as const;

/** ログ出力で利用する結果値の共通定数 */
export const logResults = {
  ACCEPTED: "accepted",
  CONNECTED: "connected",
  CREATED: "created",
  DELETED: "deleted",
  DISCONNECTED: "disconnected",
  EMITTED: "emitted",
  IGNORED_ALREADY_PLAYING: "ignored_already_playing",
  IGNORED_ALREADY_RUNNING: "ignored_already_running",
  IGNORED_DUPLICATE: "ignored_duplicate",
  IGNORED_INVALID_PAYLOAD: "ignored_invalid_payload",
  IGNORED_MISSING_ROOM: "ignored_missing_room",
  IGNORED_NO_ROOM: "ignored_no_room",
  IGNORED_PLAYER_NOT_FOUND: "ignored_player_not_found",
  IGNORED_PLAYER_NOT_IN_SESSION: "ignored_player_not_in_session",
  IGNORED_ROOM_FULL: "ignored_room_full",
  IGNORED_ROOM_NOT_FOUND: "ignored_room_not_found",
  JOINED: "joined",
  PLAYER_REMOVED: "player_removed",
  PROCESSED: "processed",
  RECEIVED: "received",
  REJECTED: "rejected",
  REJECTED_DUPLICATE: "rejected_duplicate",
  REJECTED_ROOM_FULL: "rejected_room_full",
  REMOVED: "removed",
  SESSION_DISPOSED_EMPTY_ROOM: "session_disposed_empty_room",
  STARTED: "started",
  STOPPED: "stopped",
  TRANSFERRED: "transferred",
} as const;
