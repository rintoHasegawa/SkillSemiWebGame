/**
 * logPayloadContracts
 * スコープごとのログペイロード型契約を提供する
 */
import { protocol } from "@repo/shared";
import { gameDomainLogEvents, gameUseCaseLogEvents, roomDomainLogEvents, roomUseCaseLogEvents } from "./logEventGroups";
import { logResults } from "./logResults";
import { logScopes, type LogScope } from "./logScopes";

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

/** スコープごとのログペイロード型を参照するユーティリティ */
export type LogPayloadOf<TScope extends LogScope> = LogPayloadByScope[TScope];
