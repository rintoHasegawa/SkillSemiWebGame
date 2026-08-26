/**
 * connectionPorts
 * ネットワーク接続処理で利用するポート型を提供する
 */
import type { Server } from "socket.io";
import type {
  DisconnectCoordinatorDeps,
} from "@server/application/coordinators/coordinatorDeps";
import type {
  PlayerIdentityRegistry,
  SessionReservationRegistry,
} from "@server/network/identity";
import type {
  ApplyFieldSizePresetPort,
  CleanupGameRuntimePort,
  DeleteRoomPort,
  DisconnectRoomPort,
  EnsureGameRuntimePort,
  FindGameByRoomPort,
  FindGameByPlayerPort,
  FindRoomByOwnerPort,
  FindRoomByIdPort,
  FindRoomByPlayerPort,
  JoinRoomPort,
  RestorePlayerToRoomPort,
  RoomPhaseTransitionPort,
  SelectTeamPort,
  UpdateLobbySettingsPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";

/** 接続時のルーム処理で利用する入力ポート集合 */
type ConnectionRoomPort =
  & JoinRoomPort
  & FindRoomByOwnerPort
  & FindRoomByPlayerPort
  & RoomPhaseTransitionPort;

/** 接続時のゲームランタイム解決で利用する入力ポート集合 */
type ConnectionRuntimePort =
  & EnsureGameRuntimePort
  & FindGameByRoomPort
  & FindGameByPlayerPort;

/** ゲームイベント調停で利用するルーム依存ポート */
export type GameEventRoomUseCasePort = Pick<
  ConnectionRoomPort,
  "getRoomByOwnerId" | "getRoomByPlayerId" | "markRoomPlaying" | "markRoomWaiting"
> & ApplyFieldSizePresetPort & DeleteRoomPort;

/** ゲームイベント調停で利用するランタイム依存ポート */
export type GameEventRuntimeUseCasePort = Pick<
  ConnectionRuntimePort,
  "getGameManagerByRoomId" | "getGameManagerByPlayerId"
> & CleanupGameRuntimePort;

/** ルーム参加イベント調停で利用するルーム依存ポート */
export type JoinRoomEventRoomUseCasePort = Pick<ConnectionRoomPort, "addPlayerToRoom">;

/** ロビー設定更新イベント調停で利用するルーム依存ポート */
export type LobbySettingsUpdateEventRoomUseCasePort =
  & Pick<ConnectionRoomPort, "getRoomByOwnerId">
  & UpdateLobbySettingsPort;

/** ルーム参加イベント調停で利用するランタイム依存ポート */
export type JoinRoomEventRuntimeUseCasePort = Pick<
  ConnectionRuntimePort,
  "ensureGameManagerForRoom"
>;

/** チーム選択イベント調停で利用するルーム依存ポート */
export type SelectTeamEventRoomUseCasePort = SelectTeamPort;

/** 試合復帰イベント調停で利用するルーム依存ポート */
export type ResumeSessionEventRoomUseCasePort = RestorePlayerToRoomPort;

/** 試合復帰イベント調停で利用するランタイム依存ポート */
export type ResumeSessionEventRuntimeUseCasePort = Pick<
  ConnectionRuntimePort,
  "getGameManagerByRoomId"
>;

/** 明示退室イベント調停で利用するルーム依存ポート */
export type LeaveRoomEventRoomUseCasePort =
  & DisconnectRoomPort
  & FindRoomByPlayerPort;

/** 明示退室イベント調停で利用するランタイム依存ポート */
export type LeaveRoomEventRuntimeUseCasePort = CleanupGameRuntimePort;

/** ソケット接続全体で利用するルーム管理ポート集合 */
export type SocketConnectionRoomPort =
  & ConnectionRoomPort
  & DisconnectRoomPort
  & RestorePlayerToRoomPort
  & FindRoomByIdPort
  & DeleteRoomPort
  & UpdateLobbySettingsPort
  & ApplyFieldSizePresetPort
  & SelectTeamPort;

/** ソケット接続全体で利用するランタイム管理ポート集合 */
export type SocketConnectionRuntimePort =
  & ConnectionRuntimePort
  & CleanupGameRuntimePort;

/** ソケット接続ハンドラで受け取るマネージャ依存の束 */
export type SocketConnectionManagerBundle = DisconnectCoordinatorDeps & {
  roomManager: SocketConnectionRoomPort;
  runtimeRegistry: SocketConnectionRuntimePort;
};

/** 接続ハンドラ登録関数が受け取る入力パラメータ */
export type RegisterConnectionHandlersParams = SocketConnectionManagerBundle & {
  io: Server;
  /** ソケットIDとプレイヤーIDの対応（サーバー単位で共有する） */
  identityRegistry: PlayerIdentityRegistry;
  /** 復帰用のセッション予約（サーバー単位で共有する） */
  sessionReservations: SessionReservationRegistry;
};
