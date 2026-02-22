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

      const playerIds = room.players.map((p: { id: string }) => p.id);
      
      // 同ルーム全プレイヤーのゲーム管理登録
      room.players.forEach((p: { id: string }) => {
        gameManager.addPlayer(p.id);
      });

      // ルーム全員向けゲーム開始通知
      io.to(room.roomId).emit(SocketEvents.GAME_START);

      // 20Hzのゲームループを開始
      gameManager.startGameLoop(room.roomId, io, playerIds);
    }
  });

  // 画面準備完了通知受信時初期データ返却
  socket.on(SocketEvents.READY_FOR_GAME, () => {
    const allPlayers = gameManager.getAllPlayers();
    socket.emit(SocketEvents.CURRENT_PLAYERS, allPlayers);
  });

  // ゲームプレイ中イベント群
  socket.on(SocketEvents.MOVE, (data: MovePayload) => {
    // 【変更】座標の更新のみ行い、即時の送信（io.to...emit）は全て削除
    gameManager.movePlayer(socket.id, data.x, data.y);
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