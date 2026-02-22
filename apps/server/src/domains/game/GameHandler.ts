import { Server, Socket } from "socket.io";
import { GameManager } from "./GameManager";
import { RoomManager } from "../room/RoomManager";
import { protocol, RoomStatus } from "@repo/shared";
import type { playerTypes } from "@repo/shared";

export const registerGameHandlers = (io: Server, socket: Socket, gameManager: GameManager, roomManager: RoomManager) => {
  
  // クライアントから送られてきた時刻をそのまま返しつつ、サーバーの現在時刻も添える
  socket.on(protocol.SocketEvents.PING, (clientTime: number) => {
    socket.emit(protocol.SocketEvents.PONG, { clientTime, serverTime: Date.now() });
  });

  // ゲーム開始要求処理
  socket.on(protocol.SocketEvents.START_GAME, () => {
    const room = roomManager.getRoomByOwnerId(socket.id);
    
    if (room) {
      room.status = RoomStatus.PLAYING;

      const playerIds = room.players.map((p: { id: string }) => p.id);
      
      // 同ルーム全プレイヤーのゲーム管理登録
      room.players.forEach((p: { id: string }) => {
        gameManager.addPlayer(p.id);
      });

      // 20Hzのゲームループを開始し、毎フレームの送信処理を定義
      gameManager.startGameLoop(
        room.roomId, 
        playerIds, 
        (tickData) => {
        // 1. 各プレイヤーの最新座標をクライアントに送信
        tickData.players.forEach((playerData) => {
          io.to(room.roomId).emit(protocol.SocketEvents.UPDATE_PLAYER, playerData);
        });

        // 2. 差分があれば、ルーム内の全員に一斉送信
        if (tickData.cellUpdates.length > 0) {
          io.to(room.roomId).emit(protocol.SocketEvents.UPDATE_MAP_CELLS, tickData.cellUpdates);
        }
      },

      () => {
          // 3分経過時に GameLoop から呼ばれる処理
          console.log(`[GameHandler] ルーム ${room.roomId} のゲームが終了しました (3分経過)`);
          io.to(room.roomId).emit(protocol.SocketEvents.GAME_END); // クライアントへ終了通知
          room.status = RoomStatus.WAITING; // ルーム状態を待機に戻す
        }
      );
        
      // GameManagerから開始時刻を取得し、GAME_STARTイベントにデータを乗せて送る
      const startTime = gameManager.getRoomStartTime(room.roomId) || Date.now();
      io.to(room.roomId).emit(protocol.SocketEvents.GAME_START, { startTime });
    }
  });

  // 画面準備完了通知受信時初期データ返却
  socket.on(protocol.SocketEvents.READY_FOR_GAME, () => {
    const allPlayers = gameManager.getAllPlayers();
    socket.emit(protocol.SocketEvents.CURRENT_PLAYERS, allPlayers);

    // 準備が完了したクライアントに対して、改めて開始時刻を個別に教える
    // Socket.ioの仕様上、socket.roomsには自身のIDと参加中のルームIDが含まれるため、そこからルームIDを特定する
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    if (roomId) {
      const startTime = gameManager.getRoomStartTime(roomId);
      if (startTime) {
        // io.to() による全員への一斉送信ではなく、socket.emit() でこの本人にだけ送る
        socket.emit(protocol.SocketEvents.GAME_START, { startTime });
      }
    }
  });

  // ゲームプレイ中イベント群
  socket.on(protocol.SocketEvents.MOVE, (data: playerTypes.MovePayload) => {
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
  io.emit(protocol.SocketEvents.REMOVE_PLAYER, playerId);
};