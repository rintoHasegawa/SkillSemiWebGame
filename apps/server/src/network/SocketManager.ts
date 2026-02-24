import { Server, Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import { registerRoomHandlers, handleRoomDisconnect } from "./handlers/RoomHandler";
import { registerGameHandlers, handleGameDisconnect } from "./handlers/GameHandler";

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
    this.io.on(protocol.SocketEvents.CONNECT, (socket: Socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      registerRoomHandlers(this.io, socket, this.roomManager);
      registerGameHandlers(this.io, socket, this.gameManager, this.roomManager);

      socket.on(protocol.SocketEvents.DISCONNECT, () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        
        // 順番を厳守して実行
        // 1. まずゲーム世界から消す（データ参照ができなくなる前に実行）
        handleGameDisconnect(this.io, this.gameManager, socket.id);

        // 2. 次にルームの枠組みから消す（オーナー移譲などのロジックを最後に実行）
        handleRoomDisconnect(this.io, socket, this.roomManager);
      });
    });
  }
}