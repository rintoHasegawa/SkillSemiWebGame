/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import { registerRoomHandlers, handleRoomDisconnect } from "./RoomHandler";
import { registerGameHandlers, handleGameDisconnect } from "./GameHandler";
import { logEvent } from "@server/logging/logEvent";

type RegisterConnectionHandlersParams = {
  io: Server;
  gameSessionManager: GameManager;
  roomManager: RoomManager;
};

/** ソケット接続と切断イベントに対する共通ハンドラを登録する */
export const registerConnectionHandlers = ({
  io,
  gameSessionManager,
  roomManager,
}: RegisterConnectionHandlersParams) => {
  io.on(protocol.SocketEvents.CONNECT, (socket: Socket) => {
    // 接続ログを記録してドメイン別ハンドラを登録する
    logEvent("Network", {
      event: "CONNECT",
      result: "connected",
      socketId: socket.id,
    });

    registerRoomHandlers(io, socket, roomManager);
    registerGameHandlers(io, socket, gameSessionManager, roomManager);

    socket.on(protocol.SocketEvents.DISCONNECT, () => {
      // 切断ログ記録後にドメイン別の後処理を実行する
      logEvent("Network", {
        event: "DISCONNECT",
        result: "disconnected",
        socketId: socket.id,
      });

      const roomId = roomManager.getRoomByPlayerId(socket.id)?.roomId;

      handleGameDisconnect(io, gameSessionManager, roomId, socket.id);
      handleRoomDisconnect(io, socket, roomManager);
    });
  });
};
