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

/** ログ出力で利用するスコープ名型 */
export type LogScope = (typeof logScopes)[keyof typeof logScopes];

type ValueOf<T> = T[keyof T];

/** スコープごとの event/result と必須項目の型契約 */
export type LogPayloadByScope = {
  [logScopes.NETWORK]:
    | {
        event: typeof protocol.SocketEvents.CONNECT;
        result: typeof logResults.CONNECTED;
        socketId: string;
      }
    | {
        event: typeof protocol.SocketEvents.DISCONNECT;
        result: typeof logResults.DISCONNECTED;
        socketId: string;
      }
    | {
        event: typeof protocol.SocketEvents.JOIN_ROOM;
        result:
          | typeof logResults.REJECTED_ROOM_FULL
          | typeof logResults.REJECTED_DUPLICATE
          | typeof logResults.IGNORED_INVALID_PAYLOAD;
        socketId: string;
        roomId?: string;
      }
    | {
        event: typeof protocol.SocketEvents.PING;
        result: typeof logResults.IGNORED_INVALID_PAYLOAD;
        socketId: string;
      }
    | {
        event: typeof protocol.SocketEvents.MOVE;
        result: typeof logResults.IGNORED_INVALID_PAYLOAD;
        socketId: string;
      };
  [logScopes.GAME_USE_CASE]:
    | {
        event: typeof gameUseCaseLogEvents.START_GAME;
        result:
          | typeof logResults.IGNORED_NO_ROOM
          | typeof logResults.IGNORED_ALREADY_PLAYING
          | typeof logResults.IGNORED_ROOM_NOT_FOUND
          | typeof logResults.ACCEPTED;
        socketId: string;
        roomId?: string;
      }
    | {
        event: typeof gameUseCaseLogEvents.READY_FOR_GAME;
        result:
          | typeof logResults.IGNORED_MISSING_ROOM
          | typeof logResults.RECEIVED;
        socketId: string;
        roomId?: string;
      }
    | {
        event: typeof gameUseCaseLogEvents.GAME_START;
        result: typeof logResults.EMITTED;
        socketId: string;
        roomId: string;
      }
    | {
        event: typeof gameUseCaseLogEvents.GAME_END;
        result: typeof logResults.EMITTED;
        roomId: string;
      }
    | {
        event: typeof gameUseCaseLogEvents.DISCONNECT;
        result: typeof logResults.PLAYER_REMOVED;
        socketId: string;
      };
  [logScopes.ROOM_USE_CASE]:
    | {
        event: typeof roomUseCaseLogEvents.JOIN_ROOM;
        result:
          | typeof logResults.RECEIVED
          | typeof logResults.REJECTED;
        socketId: string;
        roomId: string;
      }
    | {
        event: typeof roomUseCaseLogEvents.DISCONNECT;
        result: typeof logResults.PROCESSED;
        socketId: string;
      }
    | {
        event: typeof roomUseCaseLogEvents.ROOM_UPDATE;
        result: typeof logResults.EMITTED;
        socketId: string;
        roomId: string;
      };
  [logScopes.GAME_LOOP]: {
    event: typeof gameDomainLogEvents.GAME_LOOP;
    result:
      | typeof logResults.STARTED
      | typeof logResults.STOPPED;
    roomId: string;
  };
  [logScopes.GAME_ROOM_SESSION]: {
    event: typeof gameDomainLogEvents.MOVE;
    result:
      | typeof logResults.IGNORED_PLAYER_NOT_FOUND
      | typeof logResults.IGNORED_INVALID_PAYLOAD;
    roomId: string;
    socketId: string;
  };
  [logScopes.GAME_PLAYER_OPERATION_SERVICE]:
    | {
        event: typeof gameDomainLogEvents.PLAYER_MOVE;
        result: typeof logResults.IGNORED_PLAYER_NOT_IN_SESSION;
        socketId: string;
      }
    | {
        event: typeof gameDomainLogEvents.PLAYER_REMOVE;
        result:
          | typeof logResults.IGNORED_PLAYER_NOT_IN_SESSION
          | typeof logResults.SESSION_DISPOSED_EMPTY_ROOM;
        socketId: string;
        roomId?: string;
      };
  [logScopes.GAME_SESSION_LIFECYCLE_SERVICE]: {
    event: typeof gameDomainLogEvents.SESSION_START;
    result:
      | typeof logResults.IGNORED_ALREADY_RUNNING
      | typeof logResults.STARTED;
    roomId: string;
  };
  [logScopes.ROOM_JOIN_SERVICE]:
    | {
        event: typeof roomDomainLogEvents.ROOM_CREATE;
        result: typeof logResults.CREATED;
        roomId: string;
        socketId: string;
      }
    | {
        event: typeof roomDomainLogEvents.PLAYER_JOIN;
        result:
          | typeof logResults.IGNORED_DUPLICATE
          | typeof logResults.IGNORED_ROOM_FULL
          | typeof logResults.JOINED;
        roomId: string;
        socketId: string;
      };
  [logScopes.ROOM_EXIT_SERVICE]:
    | {
        event: typeof roomDomainLogEvents.PLAYER_LEAVE;
        result: typeof logResults.REMOVED;
        roomId: string;
        socketId: string;
      }
    | {
        event: typeof roomDomainLogEvents.ROOM_DELETE;
        result: typeof logResults.DELETED;
        roomId: string;
        socketId: string;
      }
    | {
        event: typeof roomDomainLogEvents.OWNER_TRANSFER;
        result: typeof logResults.TRANSFERRED;
        roomId: string;
        socketId: string;
      };
};
