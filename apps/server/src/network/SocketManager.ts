/**
 * SocketManager
 * Socket.IO接続ハンドラの登録を初期化するマネージャ
 */
import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { registerConnectionHandlers } from "./handlers/registerConnectionHandlers";

/** Socket.IOの接続ハンドラ登録を統括する */
export class SocketManager {
  private io: Server;
  private gameManager: GameManager;
  private roomManager: RoomManager;

  constructor(io: Server, gameManager: GameManager, roomManager: RoomManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.roomManager = roomManager;
  }

  public initialize() {
    // 接続時に必要な各ドメインハンドラを登録する
    registerConnectionHandlers({
      io: this.io,
      gameManager: this.gameManager,
      roomManager: this.roomManager,
    });
  }
}