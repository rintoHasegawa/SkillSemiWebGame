/**
 * connectionPorts
 * ネットワーク接続処理で利用するポート型を提供する
 */
import type { Server } from "socket.io";
import type {
  BombPlacementPort,
  DisconnectPlayerPort,
  MovePlayerPort,
  ReadyForGamePort,
  StartGamePort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  DisconnectRoomPort,
  FindRoomByOwnerPort,
  FindRoomByIdPort,
  FindRoomByPlayerPort,
  JoinRoomPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import type { DisconnectCoordinatorParams } from "../../application/coordinators/disconnectCoordinator";

/** 接続時のゲーム処理で利用する入力ポート集合 */
export type ConnectionGamePort =
  & StartGamePort
  & ReadyForGamePort
  & MovePlayerPort
  & BombPlacementPort;

/** 接続時のルーム処理で利用する入力ポート集合 */
export type ConnectionRoomPort =
  & JoinRoomPort
  & FindRoomByOwnerPort
  & FindRoomByPlayerPort
  & RoomPhaseTransitionPort;

/** ソケット接続全体で利用するゲーム管理ポート集合 */
export type SocketConnectionGamePort =
  & ConnectionGamePort
  & DisconnectPlayerPort;

/** ソケット接続全体で利用するルーム管理ポート集合 */
export type SocketConnectionRoomPort =
  & ConnectionRoomPort
  & DisconnectRoomPort
  & FindRoomByIdPort;

/** ソケット接続ハンドラで受け取るマネージャ依存の束 */
export type SocketConnectionManagerBundle = {
  gameManager: SocketConnectionGamePort;
  roomManager: SocketConnectionRoomPort;
};

/** 切断時のゲーム処理で利用する入力ポート */
export type DisconnectGamePort = Pick<SocketConnectionGamePort, "removePlayer">;

/** 切断時のルーム処理で利用する入力ポート集合 */
export type DisconnectRoomHandlerPort = Pick<
  SocketConnectionRoomPort,
  "removePlayer" | "getRoomByPlayerId" | "getRoomById"
>;

/** 切断調停処理へ受け渡す依存集合 */
export type DisconnectCoordinatorPortBundle = Omit<DisconnectCoordinatorParams, "socketId">;

/** 接続ハンドラ登録関数が受け取る入力パラメータ */
export type RegisterConnectionHandlersParams = SocketConnectionManagerBundle & {
  io: Server;
};
