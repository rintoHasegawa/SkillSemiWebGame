/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import { disconnectCoordinator } from "@server/application/coordinators/disconnectCoordinator";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes } from "@server/logging/index";
import { registerGameHandlers } from "./GameHandler";
import { registerRoomHandlers } from "./RoomHandler";
import { createGameDisconnectOutputAdapter } from "./game/createGameOutputAdapter";
import { createRoomDisconnectOutputAdapter } from "./room/createRoomOutputAdapter";
import type {
  RegisterConnectionHandlersParams,
} from "../types/connectionPorts";

/** ソケット接続と切断イベントに対する共通ハンドラを登録する */
export const registerConnectionHandlers = ({
  io,
  roomManager,
  runtimeRegistry,
}: RegisterConnectionHandlersParams) => {
  const gameDisconnectOutputAdapter = createGameDisconnectOutputAdapter(io);
  const roomDisconnectOutputAdapter = createRoomDisconnectOutputAdapter(io);

  io.on(protocol.SocketEvents.CONNECT, (socket: Socket) => {
    // 接続ログを記録してドメイン別ハンドラを登録する
    logEvent(logScopes.NETWORK, {
      event: protocol.SocketEvents.CONNECT,
      result: logResults.CONNECTED,
      socketId: socket.id,
    });

    registerRoomHandlers(io, socket, roomManager, runtimeRegistry);
    registerGameHandlers(io, socket, roomManager, runtimeRegistry);

    socket.on(protocol.SocketEvents.DISCONNECT, () => {
      // 切断ログ記録後にドメイン別の後処理を実行する
      logEvent(logScopes.NETWORK, {
        event: protocol.SocketEvents.DISCONNECT,
        result: logResults.DISCONNECTED,
        socketId: socket.id,
      });

      disconnectCoordinator({
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        gameOutput: gameDisconnectOutputAdapter,
        roomOutput: roomDisconnectOutputAdapter,
      });
    });
  });
};
