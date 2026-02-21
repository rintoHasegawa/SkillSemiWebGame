// src/network/SocketManager.ts
import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager.js";
// shared側の型をインポート（※パスは実際の環境に合わせて修正してください）
import type { Room } from "@repo/shared/src/types/room";
type RoomPlayer = Room["players"][0];

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;
  
  // 🌟 追加: サーバーのメモリ上でルーム情報を管理
  private rooms: Map<string, Room> = new Map();

  constructor(io: Server, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  public initialize() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      // ==========================================
      // 🚪 ロビー・ルーム関連のイベント
      // ==========================================

      socket.on("join-room", (data: { roomId: string; playerName: string }) => {
        const { roomId, playerName } = data;
        
        // socket.io の機能でグループ(ルーム)に参加
        socket.join(roomId);

        // ルームが存在しない場合は作成
        let room = this.rooms.get(roomId);
        if (!room) {
          room = {
            roomId: roomId,
            ownerId: socket.id, // 最初に作った人がオーナー
            players: [],
            status: 'waiting',
            maxPlayers: 4
          };
          this.rooms.set(roomId, room);
        }

        // プレイヤー情報を追加
        const newPlayer: RoomPlayer = {
          id: socket.id,
          name: playerName,
          isOwner: room.ownerId === socket.id,
          isReady: false
        };
        room.players.push(newPlayer);

        // ルームの全員に最新情報を送信
        this.io.to(roomId).emit("room-update", room);
      });

      // 🚀 ゲーム開始イベント
      socket.on("start-game", () => {
        // 自分がオーナーのルームを探す
        for (const [roomId, room] of this.rooms.entries()) {
          if (room.ownerId === socket.id) {
            room.status = 'playing';
            
            // 📢 全員に「ゲーム画面に切り替えて！」と指示
            this.io.to(roomId).emit("game-start");

            // 🎮 ここで初めて全員を GameManager (PixiJSの世界) に追加する
            room.players.forEach(p => {
              this.gameManager.addPlayer(p.id);
            });

            // ゲーム用の初期データを送信 (参加した全員分の座標など)
            // getAllPlayers() は Map を配列に変換して返すメソッドと仮定
            const allPlayers = Array.from(this.gameManager['players'].values());
            this.io.to(roomId).emit("current_players", allPlayers);
            break;
          }
        }
      });

      // ==========================================
      // 🎮 ゲームプレイ中のイベント
      // ==========================================

      socket.on("move", (data: { x: number; y: number }) => {
        // マネージャーの状態を更新
        this.gameManager.movePlayer(socket.id, data.x, data.y);
        
        const updatedPlayer = this.gameManager.getPlayer(socket.id);
        if (updatedPlayer) {
            // 自分のいるルームを取得して、同じルームの人にだけ座標を送る
            const myRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            const targetRoom = myRooms.length > 0 ? myRooms[0] : null;

            if (targetRoom) {
              this.io.to(targetRoom).emit("update_player", { 
                  id: socket.id, 
                  x: updatedPlayer.x, 
                  y: updatedPlayer.y 
              });
            }
        }
      });

      // ==========================================
      // ❌ 切断時のイベント
      // ==========================================

      socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        this.gameManager.removePlayer(socket.id);
        this.io.emit("remove_player", socket.id);

        // ルームからも削除する
        for (const [roomId, room] of this.rooms.entries()) {
          const playerIndex = room.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            
            if (room.players.length === 0) {
              // 誰もいなくなったらルームごと削除
              this.rooms.delete(roomId);
            } else {
              // オーナーが抜けた場合は次の人をオーナーにする
              if (room.ownerId === socket.id) {
                room.ownerId = room.players[0].id;
                room.players[0].isOwner = true;
              }
              this.io.to(roomId).emit("room-update", room);
            }
          }
        }
      });

    });
  }
}