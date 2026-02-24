/**
 * SocketManager
 * Socket.IO接続ハンドラの登録を初期化するマネージャ
 */
import { Server } from "socket.io";
import { GameSessionManager } from "@server/domains/game/GameSessionManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { registerConnectionHandlers } from "./handlers/registerConnectionHandlers";

/** Socket.IOの接続ハンドラ登録を統括する */
export class SocketManager {
  private io: Server;
  private gameSessionManager: GameSessionManager;
  private roomManager: RoomManager;

  constructor(io: Server, gameSessionManager: GameSessionManager, roomManager: RoomManager) {
    this.io = io;
    this.gameSessionManager = gameSessionManager;
    this.roomManager = roomManager;
  }

  public initialize() {
    // 接続時に必要な各ドメインハンドラを登録する
    registerConnectionHandlers({
      io: this.io,
      gameSessionManager: this.gameSessionManager,
      roomManager: this.roomManager,
    });
  }
}