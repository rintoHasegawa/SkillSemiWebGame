/**
 * payloadByScope
 * スコープごとのログペイロード型契約を提供する
 */
import { protocol } from "@repo/shared";
import { gameDomainLogEvents, gameUseCaseLogEvents, roomDomainLogEvents, roomUseCaseLogEvents } from "../constants/eventNames";
import { logResults } from "../constants/results";
import { logScopes, type LogScope } from "../constants/scopes";

/** Network接続確立ログの契約 */
type NetworkConnectLogPayload = {
  event: typeof protocol.SocketEvents.CONNECT;
  result: typeof logResults.CONNECTED;
  socketId: string;
};

/** Network切断ログの契約 */
type NetworkDisconnectLogPayload = {
  event: typeof protocol.SocketEvents.DISCONNECT;
  result: typeof logResults.DISCONNECTED;
  socketId: string;
};

/** Network参加要求ログの契約 */
type NetworkJoinRoomLogPayload = {
  event: typeof protocol.SocketEvents.JOIN_ROOM;
  result:
    | typeof logResults.REJECTED_ROOM_FULL
    | typeof logResults.REJECTED_DUPLICATE
    | typeof logResults.IGNORED_INVALID_PAYLOAD;
  socketId: string;
  roomId?: string;
};

/** NetworkのPING不正ペイロードログ契約 */
type NetworkPingLogPayload = {
  event: typeof protocol.SocketEvents.PING;
  result: typeof logResults.IGNORED_INVALID_PAYLOAD;
  socketId: string;
};

/** NetworkのMOVE不正ペイロードログ契約 */
type NetworkMoveLogPayload = {
  event: typeof protocol.SocketEvents.MOVE;
  result: typeof logResults.IGNORED_INVALID_PAYLOAD;
  socketId: string;
};

/** Networkスコープのログ契約ユニオン */
type NetworkLogPayload =
  | NetworkConnectLogPayload
  | NetworkDisconnectLogPayload
  | NetworkJoinRoomLogPayload
  | NetworkPingLogPayload
  | NetworkMoveLogPayload;

/** GameUseCaseのSTART_GAMEログ契約 */
type GameUseCaseStartGameLogPayload = {
  event: typeof gameUseCaseLogEvents.START_GAME;
  result:
    | typeof logResults.IGNORED_NO_ROOM
    | typeof logResults.IGNORED_ALREADY_PLAYING
    | typeof logResults.IGNORED_ROOM_NOT_FOUND
    | typeof logResults.ACCEPTED;
  socketId: string;
  roomId?: string;
};

/** GameUseCaseのREADY_FOR_GAMEログ契約 */
type GameUseCaseReadyForGameLogPayload = {
  event: typeof gameUseCaseLogEvents.READY_FOR_GAME;
  result:
    | typeof logResults.IGNORED_MISSING_ROOM
    | typeof logResults.RECEIVED;
  socketId: string;
  roomId?: string;
};

/** GameUseCaseのGAME_STARTログ契約 */
type GameUseCaseGameStartLogPayload = {
  event: typeof gameUseCaseLogEvents.GAME_START;
  result: typeof logResults.EMITTED;
  socketId: string;
  roomId: string;
};

/** GameUseCaseのGAME_ENDログ契約 */
type GameUseCaseGameEndLogPayload = {
  event: typeof gameUseCaseLogEvents.GAME_END;
  result: typeof logResults.EMITTED;
  roomId: string;
};

/** GameUseCaseのDISCONNECTログ契約 */
type GameUseCaseDisconnectLogPayload = {
  event: typeof gameUseCaseLogEvents.DISCONNECT;
  result: typeof logResults.PLAYER_REMOVED;
  socketId: string;
};

/** GameUseCaseスコープのログ契約ユニオン */
type GameUseCaseLogPayload =
  | GameUseCaseStartGameLogPayload
  | GameUseCaseReadyForGameLogPayload
  | GameUseCaseGameStartLogPayload
  | GameUseCaseGameEndLogPayload
  | GameUseCaseDisconnectLogPayload;

/** RoomUseCaseのJOIN_ROOMログ契約 */
type RoomUseCaseJoinRoomLogPayload = {
  event: typeof roomUseCaseLogEvents.JOIN_ROOM;
  result:
    | typeof logResults.RECEIVED
    | typeof logResults.REJECTED;
  socketId: string;
  roomId: string;
};

/** RoomUseCaseのDISCONNECTログ契約 */
type RoomUseCaseDisconnectLogPayload = {
  event: typeof roomUseCaseLogEvents.DISCONNECT;
  result: typeof logResults.PROCESSED;
  socketId: string;
};

/** RoomUseCaseのROOM_UPDATEログ契約 */
type RoomUseCaseRoomUpdateLogPayload = {
  event: typeof roomUseCaseLogEvents.ROOM_UPDATE;
  result: typeof logResults.EMITTED;
  socketId: string;
  roomId: string;
};

/** RoomUseCaseスコープのログ契約ユニオン */
type RoomUseCaseLogPayload =
  | RoomUseCaseJoinRoomLogPayload
  | RoomUseCaseDisconnectLogPayload
  | RoomUseCaseRoomUpdateLogPayload;

/** GamePlayerOperationServiceのPLAYER_MOVEログ契約 */
type GamePlayerOperationServiceMoveLogPayload = {
  event: typeof gameDomainLogEvents.PLAYER_MOVE;
  result: typeof logResults.IGNORED_PLAYER_NOT_IN_SESSION;
  socketId: string;
};

/** GamePlayerOperationServiceのPLAYER_REMOVEログ契約 */
type GamePlayerOperationServiceRemoveLogPayload = {
  event: typeof gameDomainLogEvents.PLAYER_REMOVE;
  result:
    | typeof logResults.IGNORED_PLAYER_NOT_IN_SESSION
    | typeof logResults.SESSION_DISPOSED_EMPTY_ROOM;
  socketId: string;
  roomId?: string;
};

/** GamePlayerOperationServiceスコープのログ契約ユニオン */
type GamePlayerOperationServiceLogPayload =
  | GamePlayerOperationServiceMoveLogPayload
  | GamePlayerOperationServiceRemoveLogPayload;

/** GameLoopスコープのログ契約 */
type GameLoopLogPayload = {
  event: typeof gameDomainLogEvents.GAME_LOOP;
  result:
    | typeof logResults.STARTED
    | typeof logResults.STOPPED;
  roomId: string;
};

/** GameRoomSessionスコープのログ契約 */
type GameRoomSessionLogPayload = {
  event: typeof gameDomainLogEvents.MOVE;
  result:
    | typeof logResults.IGNORED_PLAYER_NOT_FOUND
    | typeof logResults.IGNORED_INVALID_PAYLOAD;
  roomId: string;
  socketId: string;
};

/** GameSessionLifecycleServiceスコープのログ契約 */
type GameSessionLifecycleServiceLogPayload = {
  event: typeof gameDomainLogEvents.SESSION_START;
  result:
    | typeof logResults.IGNORED_ALREADY_RUNNING
    | typeof logResults.STARTED;
  roomId: string;
};

/** RoomJoinServiceのROOM_CREATEログ契約 */
type RoomJoinServiceRoomCreateLogPayload = {
  event: typeof roomDomainLogEvents.ROOM_CREATE;
  result: typeof logResults.CREATED;
  roomId: string;
  socketId: string;
};

/** RoomJoinServiceのPLAYER_JOINログ契約 */
type RoomJoinServicePlayerJoinLogPayload = {
  event: typeof roomDomainLogEvents.PLAYER_JOIN;
  result:
    | typeof logResults.IGNORED_DUPLICATE
    | typeof logResults.IGNORED_ROOM_FULL
    | typeof logResults.JOINED;
  roomId: string;
  socketId: string;
};

/** RoomJoinServiceスコープのログ契約ユニオン */
type RoomJoinServiceLogPayload =
  | RoomJoinServiceRoomCreateLogPayload
  | RoomJoinServicePlayerJoinLogPayload;

/** RoomExitServiceのPLAYER_LEAVEログ契約 */
type RoomExitServicePlayerLeaveLogPayload = {
  event: typeof roomDomainLogEvents.PLAYER_LEAVE;
  result: typeof logResults.REMOVED;
  roomId: string;
  socketId: string;
};

/** RoomExitServiceのROOM_DELETEログ契約 */
type RoomExitServiceRoomDeleteLogPayload = {
  event: typeof roomDomainLogEvents.ROOM_DELETE;
  result: typeof logResults.DELETED;
  roomId: string;
  socketId: string;
};

/** RoomExitServiceのOWNER_TRANSFERログ契約 */
type RoomExitServiceOwnerTransferLogPayload = {
  event: typeof roomDomainLogEvents.OWNER_TRANSFER;
  result: typeof logResults.TRANSFERRED;
  roomId: string;
  socketId: string;
};

/** RoomExitServiceスコープのログ契約ユニオン */
type RoomExitServiceLogPayload =
  | RoomExitServicePlayerLeaveLogPayload
  | RoomExitServiceRoomDeleteLogPayload
  | RoomExitServiceOwnerTransferLogPayload;

/** スコープごとの event/result と必須項目の型契約 */
export type LogPayloadByScope = {
  [logScopes.NETWORK]: NetworkLogPayload;
  [logScopes.GAME_USE_CASE]: GameUseCaseLogPayload;
  [logScopes.ROOM_USE_CASE]: RoomUseCaseLogPayload;
  [logScopes.GAME_LOOP]: GameLoopLogPayload;
  [logScopes.GAME_ROOM_SESSION]: GameRoomSessionLogPayload;
  [logScopes.GAME_PLAYER_OPERATION_SERVICE]: GamePlayerOperationServiceLogPayload;
  [logScopes.GAME_SESSION_LIFECYCLE_SERVICE]: GameSessionLifecycleServiceLogPayload;
  [logScopes.ROOM_JOIN_SERVICE]: RoomJoinServiceLogPayload;
  [logScopes.ROOM_EXIT_SERVICE]: RoomExitServiceLogPayload;
};

/** スコープごとのログペイロード型を参照するユーティリティ */
export type LogPayloadOf<TScope extends LogScope> = LogPayloadByScope[TScope];
