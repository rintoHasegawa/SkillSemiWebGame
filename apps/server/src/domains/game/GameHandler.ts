import { Server, Socket } from "socket.io";
import { GameManager } from "./GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import type { playerTypes } from "@repo/shared";
import { onPing } from "./handlers/onPing";
import { onStartGame } from "./handlers/onStartGame";
import { onReadyForGame } from "./handlers/onReadyForGame";
import { onMove } from "./handlers/onMove";
import { onDisconnect } from "./handlers/onDisconnect";

export const registerGameHandlers = (io: Server, socket: Socket, gameManager: GameManager, roomManager: RoomManager) => {
  
  // クライアントから送られてきた時刻をそのまま返しつつ、サーバーの現在時刻も添える
  socket.on(protocol.SocketEvents.PING, (clientTime: number) => {
    onPing(socket, clientTime);
  });

  // ゲーム開始要求処理
  socket.on(protocol.SocketEvents.START_GAME, () => {
    onStartGame(io, gameManager, roomManager, socket.id);
  });

  // 画面準備完了通知受信時初期データ返却
  socket.on(protocol.SocketEvents.READY_FOR_GAME, () => {
    onReadyForGame(socket, gameManager);
  });

  // ゲームプレイ中イベント群
  socket.on(protocol.SocketEvents.MOVE, (data: playerTypes.MovePayload) => {
    onMove(gameManager, socket.id, data);
  });

};

/**
 * 切断時のゲームクリーンアップ処理
 */
export const handleGameDisconnect = (io: Server, gameManager: GameManager, playerId: string) => {
  onDisconnect(io, gameManager, playerId);
};