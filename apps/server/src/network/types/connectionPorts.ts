/**
 * connectionPorts
 * ネットワーク接続処理で利用するポート型を提供する
 */
import type { Server } from "socket.io";
import type {
  CleanupGameRuntimePort,
  DisconnectDeps,
  DisconnectRoomPort,
  EnsureGameRuntimePort,
  FindGameByRoomPort,
  FindGameByPlayerPort,
  FindRoomByOwnerPort,
  FindRoomByIdPort,
  FindRoomByPlayerPort,
  JoinRoomPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";

/** 接続時のルーム処理で利用する入力ポート集合 */
export type ConnectionRoomPort =
  & JoinRoomPort
  & FindRoomByOwnerPort
  & FindRoomByPlayerPort
  & RoomPhaseTransitionPort;

/** 接続時のゲームランタイム解決で利用する入力ポート集合 */
export type ConnectionRuntimePort =
  & EnsureGameRuntimePort
  & FindGameByRoomPort
  & FindGameByPlayerPort;

/** ソケット接続全体で利用するルーム管理ポート集合 */
export type SocketConnectionRoomPort =
  & ConnectionRoomPort
  & DisconnectRoomPort
  & FindRoomByIdPort;

/** ソケット接続全体で利用するランタイム管理ポート集合 */
export type SocketConnectionRuntimePort =
  & ConnectionRuntimePort
  & CleanupGameRuntimePort;

/** ソケット接続ハンドラで受け取るマネージャ依存の束 */
export type SocketConnectionManagerBundle = DisconnectDeps & {
  roomManager: SocketConnectionRoomPort;
  runtimeRegistry: SocketConnectionRuntimePort;
};

/** 接続ハンドラ登録関数が受け取る入力パラメータ */
export type RegisterConnectionHandlersParams = SocketConnectionManagerBundle & {
  io: Server;
};
