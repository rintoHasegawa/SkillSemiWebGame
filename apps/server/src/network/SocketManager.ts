// src/network/SocketManager.ts
import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager.js";

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;

  constructor(io: Server, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  public initialize() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      // 1. ゲームにプレイヤーを追加
      const player = this.gameManager.addPlayer(socket.id);

      // 2. 参加した本人に「現在の全プレイヤー」を教える
      socket.emit("current_players", this.gameManager.getAllPlayers());

      // 3. 他のみんなに「新しい人が来たよ」と教える
      socket.broadcast.emit("new_player", player);

      // --- イベント受信 ---

      // 移動データが来た時
      socket.on("move", (data: { x: number; y: number }) => {
        // マネージャーの状態を更新
        this.gameManager.movePlayer(socket.id, data.x, data.y);
        
        // 全員に位置情報を配信
        // (人数が増えたらここを最適化しますが、まずはこれでOK)
        this.io.emit("update_player", { id: socket.id, x: data.x, y: data.y });
      });

      // 切断した時
      socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        this.gameManager.removePlayer(socket.id);
        this.io.emit("remove_player", socket.id);
      });
    });
  }
}