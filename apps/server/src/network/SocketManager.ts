/**
 * SocketManager
 * Socket.IO接続ハンドラの登録を初期化するマネージャ
 */
import { Server } from "socket.io";
import type {
  SocketConnectionManagerBundle,
  SocketConnectionGamePort,
  SocketConnectionRoomPort,
} from "./types/connectionPorts";
import { registerConnectionHandlers } from "./handlers/registerConnectionHandlers";

/** Socket.IOの接続ハンドラ登録を統括する */
export class SocketManager {
  private io: Server;
  private managers: SocketConnectionManagerBundle;

  constructor(
    io: Server,
    gameManager: SocketConnectionGamePort,
    roomManager: SocketConnectionRoomPort
  ) {
    this.io = io;
    this.managers = {
      gameManager,
      roomManager,
    };
  }

  public initialize() {
    // 接続時に必要な各ドメインハンドラを登録する
    registerConnectionHandlers({
      io: this.io,
      ...this.managers,
    });
  }
}