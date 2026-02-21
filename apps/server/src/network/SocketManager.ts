import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager.js";
import { RoomManager } from "../managers/RoomManager.js";
import { SocketEvents } from "@repo/shared/src/protocol/events";
import { registerRoomHandlers } from "../handlers/RoomHandler.js";
import { registerGameHandlers } from "../handlers/GameHandler.js";

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;
  private roomManager: RoomManager;

  constructor(io: Server, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.roomManager = new RoomManager(); // 新設したRoomManagerをインスタンス化
  }

  public initialize() {
    this.io.on(SocketEvents.CONNECT, (socket: Socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      // 各ハンドラに処理を委譲（ルーティング）
      registerRoomHandlers(this.io, socket, this.roomManager);
      registerGameHandlers(this.io, socket, this.gameManager, this.roomManager);

      // 切断時イベント群
      socket.on(SocketEvents.DISCONNECT, () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        
        // 1. ゲームからの除外処理
        this.gameManager.removePlayer(socket.id);
        this.io.emit(SocketEvents.REMOVE_PLAYER, socket.id);

        // 2. ルームからの除外処理
        const updatedRooms = this.roomManager.removePlayer(socket.id);
        
        // 更新があったルーム（オーナー変更など）にのみ通知を飛ばす
        updatedRooms.forEach(room => {
          this.io.to(room.roomId).emit(SocketEvents.ROOM_UPDATE, room);
        });
      });

    });
  }
}