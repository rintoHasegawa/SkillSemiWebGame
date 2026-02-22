import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager.js";
import { RoomManager } from "../managers/RoomManager.js";
import { SocketEvents } from "@repo/shared/src/protocol/events";
import { RoomStatus } from "@repo/shared/src/domains/room/room.type";
import type { MovePayload } from "@repo/shared/src/domains/player/player.type";

export const registerGameHandlers = (io: Server, socket: Socket, gameManager: GameManager, roomManager: RoomManager) => {
  
  // ゲーム開始要求処理
  socket.on(SocketEvents.START_GAME, () => {
    const room = roomManager.getRoomByOwnerId(socket.id);
    
    if (room) {
      room.status = RoomStatus.PLAYING;
      
      // 同ルーム全プレイヤーのゲーム管理登録
      room.players.forEach((p: { id: string }) => {
        gameManager.addPlayer(p.id);
      });

      // ルーム全員向けゲーム開始通知
      io.to(room.roomId).emit(SocketEvents.GAME_START);
    }
  });

  // 画面準備完了通知受信時初期データ返却
  socket.on(SocketEvents.READY_FOR_GAME, () => {
    const allPlayers = gameManager.getAllPlayers();
    socket.emit(SocketEvents.CURRENT_PLAYERS, allPlayers);
  });

  // ゲームプレイ中イベント群
  socket.on(SocketEvents.MOVE, (data: MovePayload) => {
    gameManager.movePlayer(socket.id, data.x, data.y);
    
    const updatedPlayer = gameManager.getPlayer(socket.id);
    if (updatedPlayer) {
      const myRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      const targetRoom = myRooms.length > 0 ? myRooms[0] : null;

      if (targetRoom) {
        io.to(targetRoom).emit(SocketEvents.UPDATE_PLAYER, { 
          id: socket.id, 
          x: updatedPlayer.x, 
          y: updatedPlayer.y 
        });

        // ② 【新規】マス目の更新と差分送信のテスト
        const cellUpdates = gameManager.paintAndGetUpdates(socket.id);
        if (cellUpdates.length > 0) {
          io.to(targetRoom).emit(SocketEvents.UPDATE_MAP_CELLS, cellUpdates);
          // ログを出してサーバー側で送信されているか確認すると便利です
          console.log(`[MAP_UPDATE] Sent ${cellUpdates.length} updates to room ${targetRoom}`);
        }
      }
    }
  });

};

/**
 * 切断時のゲームクリーンアップ処理
 */
export const handleGameDisconnect = (io: Server, gameManager: GameManager, playerId: string) => {
  // ゲームからの除外処理
  gameManager.removePlayer(playerId);
  // 全体にプレイヤー削除を通知
  io.emit(SocketEvents.REMOVE_PLAYER, playerId);
};