/**
 * payloadByScope
 * スコープごとのログペイロード型契約を提供する
 */
import { contracts as protocol, type FieldSizePreset } from "@repo/shared";
import { gameDomainLogEvents, gameUseCaseLogEvents, roomDomainLogEvents, roomUseCaseLogEvents } from "../constants/eventNames";
import { logResults } from "../constants/results";
import { logScopes } from "../constants/scopes";

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
    | typeof logResults.REJECTED_ROOM_PLAYING
    | typeof logResults.IGNORED_INVALID_PAYLOAD
    | typeof logResults.IGNORED_MISSING_ROOM;
  socketId: string;
  roomId?: string;
};

/** NetworkのPING非適用ログ契約 */
type NetworkPingLogPayload = {
  event: typeof protocol.SocketEvents.PING;
  result:
    | typeof logResults.IGNORED_INVALID_PAYLOAD
    | typeof logResults.IGNORED_MISSING_ROOM;
  socketId: string;
};

/** NetworkのMOVE不正ペイロードログ契約 */
type NetworkMoveLogPayload = {
  event: typeof protocol.SocketEvents.MOVE;
  result:
    | typeof logResults.IGNORED_INVALID_PAYLOAD
    | typeof logResults.IGNORED_MISSING_ROOM;
  socketId: string;
};

/** NetworkのPLACE_BOMB不正ペイロードログ契約 */
type NetworkPlaceBombLogPayload = {
  event: typeof protocol.SocketEvents.PLACE_BOMB;
  result:
    | typeof logResults.IGNORED_INVALID_PAYLOAD
    | typeof logResults.IGNORED_MISSING_ROOM;
  socketId: string;
};

/** NetworkのBOMB_HIT_REPORT不正ペイロードログ契約 */
type NetworkBombHitReportLogPayload = {
  event: typeof protocol.SocketEvents.BOMB_HIT_REPORT;
  result:
    | typeof logResults.IGNORED_INVALID_PAYLOAD
    | typeof logResults.IGNORED_MISSING_ROOM;
  socketId: string;
};

/** NetworkのLOBBY_SETTINGS_UPDATE非適用ログ契約 */
type NetworkLobbySettingsUpdateLogPayload = {
  event: typeof protocol.SocketEvents.LOBBY_SETTINGS_UPDATE;
  result:
    | typeof logResults.IGNORED_INVALID_PAYLOAD
    | typeof logResults.IGNORED_MISSING_ROOM
    | typeof logResults.IGNORED_NO_CHANGE
    | typeof logResults.IGNORED_UPDATE_FAILED;
  socketId: string;
  /** 更新対象ルーム（ルーム解決後の分岐のみ） */
  roomId?: string;
};

/** NetworkのSELECT_TEAM非適用ログ契約 */
type NetworkSelectTeamLogPayload = {
  event: typeof protocol.SocketEvents.SELECT_TEAM;
  result:
    | typeof logResults.IGNORED_INVALID_PAYLOAD
    | typeof logResults.IGNORED_MISSING_ROOM;
  socketId: string;
};

/** Networkスコープのログ契約ユニオン */
type NetworkLogPayload =
  | NetworkConnectLogPayload
  | NetworkDisconnectLogPayload
  | NetworkJoinRoomLogPayload
  | NetworkPingLogPayload
  | NetworkMoveLogPayload
  | NetworkPlaceBombLogPayload
  | NetworkBombHitReportLogPayload
  | NetworkLobbySettingsUpdateLogPayload
  | NetworkSelectTeamLogPayload;

/** GameUseCaseのPINGログ契約 */
type GameUseCasePingLogPayload = {
  event: typeof gameUseCaseLogEvents.PING;
  result: typeof logResults.IGNORED_SESSION_NOT_STARTED;
  socketId: string;
};

/** GameUseCaseのSTART_GAMEログ契約 */
type GameUseCaseStartGameLogPayload = {
  event: typeof gameUseCaseLogEvents.START_GAME;
  result:
    | typeof logResults.IGNORED_NO_ROOM
    | typeof logResults.IGNORED_ALREADY_PLAYING
    | typeof logResults.IGNORED_ROOM_NOT_FOUND
    | typeof logResults.IGNORED_MISSING_RUNTIME
    | typeof logResults.ACCEPTED;
  socketId: string;
  roomId?: string;
  /** 開始したセッションの参加人数（accepted時のみ） */
  totalPlayers?: number;
  /** 開始時に確定したフィールドサイズ（accepted時のみ） */
  fieldSizePreset?: FieldSizePreset;
  /**
   * playing遷移の取り消し結果（ignored_missing_runtime時のみ）
   * RoomPhaseTransitionResultのstatusに対応する
   */
  rollbackStatus?: "updated" | "not_found" | "invalid_transition";
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

/** GameUseCaseのPLACE_BOMBログ契約 */
type GameUseCasePlaceBombLogPayload = {
  event: typeof gameUseCaseLogEvents.PLACE_BOMB;
  result:
    | typeof logResults.IGNORED_SESSION_NOT_STARTED
    | typeof logResults.REJECTED_COOLDOWN;
  socketId: string;
  roomId: string;
};

/** GameUseCaseのDISCONNECTログ契約 */
type GameUseCaseDisconnectLogPayload = {
  event: typeof gameUseCaseLogEvents.DISCONNECT;
  result:
    | typeof logResults.PLAYER_REMOVED
    | typeof logResults.IGNORED_MISSING_ROOM;
  socketId: string;
  /** Bot引き継ぎで在席を維持したか（player_removed時のみ） */
  replacedWithBot?: boolean;
};

/** GameUseCaseスコープのログ契約ユニオン */
type GameUseCaseLogPayload =
  | GameUseCasePingLogPayload
  | GameUseCaseStartGameLogPayload
  | GameUseCaseReadyForGameLogPayload
  | GameUseCaseGameStartLogPayload
  | GameUseCaseGameEndLogPayload
  | GameUseCasePlaceBombLogPayload
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

/** GameLoopのライフサイクルログ契約 */
type GameLoopLifecycleLogPayload = {
  event: typeof gameDomainLogEvents.GAME_LOOP;
  result:
    | typeof logResults.STARTED
    | typeof logResults.STOPPED;
  roomId: string;
};

/** GameLoopの1秒間パフォーマンス統計ログ契約 */
type GameLoopPerfStatsLogPayload = {
  event: typeof gameDomainLogEvents.PERF_STATS;
  result: typeof logResults.STATS;
  roomId: string;
  /** ルーム内プレイヤー数 */
  playerCount: number;
  /** 1秒間に処理したtick数（期待値: 20） */
  tickCount: number;
  /** tick処理の平均時間（ms） */
  avgTickMs: number;
  /** tick処理の最大時間（ms） */
  maxTickMs: number;
  /** tick処理時間の合計 / 計測ウィンドウ × 100（%） */
  cpuUsagePct: number;
  /** 1tickあたりの平均ペイロードサイズ（bytes，JSON推定値） */
  avgPayloadBytesPerTick: number;
  /** 毎秒の送信バイト数推定（窓内の総ペイロード × playerCount ÷ 窓経過秒） */
  outboundBytesPerSec: number;
};

/** GameLoopスコープのログ契約 */
type GameLoopLogPayload =
  | GameLoopLifecycleLogPayload
  | GameLoopPerfStatsLogPayload;

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
    | typeof logResults.REJECTED_ROOM_PLAYING
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

/** RoomSettingsServiceのLOBBY_SETTINGS_UPDATEログ契約 */
type RoomSettingsServiceLobbySettingsUpdateLogPayload = {
  event: typeof roomDomainLogEvents.LOBBY_SETTINGS_UPDATE;
  result: typeof logResults.IGNORED_INVALID_PAYLOAD;
  roomId: string;
  /** 拒否した要求値（検証失敗の原因特定用） */
  targetPlayerCount: number;
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
  [logScopes.ROOM_SETTINGS_SERVICE]: RoomSettingsServiceLobbySettingsUpdateLogPayload;
};
