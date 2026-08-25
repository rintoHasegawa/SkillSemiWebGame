/**
 * SocketManager
 * Socket.IO接続ハンドラの登録を初期化するマネージャ
 */
import { Server } from "socket.io";
import type {
  PlayerIdentityRegistry,
  SessionReservationRegistry,
} from "./identity";
import type {
  SocketConnectionManagerBundle,
  SocketConnectionRoomPort,
  SocketConnectionRuntimePort,
} from "./types/connectionPorts";
import { registerConnectionHandlers } from "./handlers";

/** SocketManager 生成時に受け取る依存集合 */
export type SocketManagerParams = {
  io: Server;
  roomManager: SocketConnectionRoomPort;
  runtimeRegistry: SocketConnectionRuntimePort;
  /** ソケットIDとプレイヤーIDの対応（サーバー単位で共有する） */
  identityRegistry: PlayerIdentityRegistry;
  /** 復帰用のセッション予約（サーバー単位で共有する） */
  sessionReservations: SessionReservationRegistry;
};

/** Socket.IOの接続ハンドラ登録を統括する */
export class SocketManager {
  private io: Server;
  private managers: SocketConnectionManagerBundle;
  private identityRegistry: PlayerIdentityRegistry;
  private sessionReservations: SessionReservationRegistry;

  constructor({
    io,
    roomManager,
    runtimeRegistry,
    identityRegistry,
    sessionReservations,
  }: SocketManagerParams) {
    this.io = io;
    this.managers = {
      roomManager,
      runtimeRegistry,
    };
    this.identityRegistry = identityRegistry;
    this.sessionReservations = sessionReservations;
  }

  public initialize() {
    // 接続時に必要な各ドメインハンドラを登録する
    registerConnectionHandlers({
      io: this.io,
      identityRegistry: this.identityRegistry,
      sessionReservations: this.sessionReservations,
      ...this.managers,
    });
  }
}
