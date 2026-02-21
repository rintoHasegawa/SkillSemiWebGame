import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager.js";
import { Room, RoomStatus, RoomMember, JoinRoomPayload } from "@repo/shared/src/types/room";
import { SocketEvents } from "@repo/shared/src/protocol/events";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";
import type { MovePayload } from "@repo/shared/src/types/payloads";

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;
  
  // サーバーメモリ上ルーム情報テーブル
  private rooms: Map<string, Room> = new Map();

  constructor(io: Server, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  public initialize() {
    this.io.on(SocketEvents.CONNECT, (socket: Socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      // ロビー・ルーム関連イベント群

      socket.on(SocketEvents.JOIN_ROOM, (data: JoinRoomPayload) => {
        const { roomId, playerName } = data;
        
        socket.join(roomId);

        let room = this.rooms.get(roomId);
        if (!room) {
          room = {
            roomId: roomId,
            ownerId: socket.id,
            players: [],
            status: RoomStatus.WAITING,
            maxPlayers: GAME_CONFIG.MAX_PLAYERS_PER_ROOM
          };
          this.rooms.set(roomId, room);
        }

        // 参加プレイヤー情報ルーム追加
        const newPlayer: RoomMember = {
          id: socket.id,
          name: playerName,
          isOwner: room.ownerId === socket.id,
          isReady: false
        };
        room.players.push(newPlayer);

        // ルーム内全員向け最新状態配信
        this.io.to(roomId).emit(SocketEvents.ROOM_UPDATE, room);
      });

      // ゲーム開始要求処理
      socket.on(SocketEvents.START_GAME, () => {
        for (const [roomId, room] of this.rooms.entries()) {
          if (room.ownerId === socket.id) {
            room.status = RoomStatus.PLAYING;
            
            // 同ルーム全プレイヤーのゲーム管理登録
            room.players.forEach(p => {
              this.gameManager.addPlayer(p.id);
            });

            // ルーム全員向けゲーム開始通知
            this.io.to(roomId).emit(SocketEvents.GAME_START);
            
            // 初期プレイヤー一覧送信タイミング分離方針
            break;
          }
        }
      });

      // 画面準備完了通知受信時初期データ返却
      socket.on(SocketEvents.READY_FOR_GAME, () => {
        // ゲーム管理中全プレイヤー情報取得
        const allPlayers = this.gameManager.getAllPlayers();
        
        // 通知元ソケット限定初期データ送信
        socket.emit(SocketEvents.CURRENT_PLAYERS, allPlayers);
      });

      // ゲームプレイ中イベント群

      socket.on(SocketEvents.MOVE, (data: MovePayload) => {
        // サーバー側プレイヤー座標更新
        this.gameManager.movePlayer(socket.id, data.x, data.y);
        
        const updatedPlayer = this.gameManager.getPlayer(socket.id);
        if (updatedPlayer) {
            // 同一ルーム参加者限定座標更新配信
            const myRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            const targetRoom = myRooms.length > 0 ? myRooms[0] : null;

            if (targetRoom) {
              this.io.to(targetRoom).emit(SocketEvents.UPDATE_PLAYER, { 
                  id: socket.id, 
                  x: updatedPlayer.x, 
                  y: updatedPlayer.y 
              });
            }
        }
      });

      // 切断時イベント群

      socket.on(SocketEvents.DISCONNECT, () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        this.gameManager.removePlayer(socket.id);
        this.io.emit(SocketEvents.REMOVE_PLAYER, socket.id);

        // 参加中ルームからの切断プレイヤー除外処理
        for (const [roomId, room] of this.rooms.entries()) {
          const playerIndex = room.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            
            if (room.players.length === 0) {
              // 空ルーム削除分岐
              this.rooms.delete(roomId);
            } else {
              // オーナー切断時所有権移譲処理
              if (room.ownerId === socket.id) {
                room.ownerId = room.players[0].id;
                room.players[0].isOwner = true;
              }
              this.io.to(roomId).emit(SocketEvents.ROOM_UPDATE, room);
            }
          }
        }
      });

    });
  }
}