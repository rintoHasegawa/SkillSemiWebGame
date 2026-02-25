/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import { disconnectCoordinator } from "@server/application/coordinators/disconnectCoordinator";
import { logEvent } from "@server/logging/logEvent";
import { registerGameHandlers } from "./GameHandler";
import { registerRoomHandlers } from "./RoomHandler";
import { createGameDisconnectOutputAdapter } from "./game/createGameOutputAdapter";
import { createRoomDisconnectOutputAdapter } from "./room/createRoomOutputAdapter";
import type {
  ConnectionGamePort,
  ConnectionRoomPort,
  DisconnectCoordinatorPortBundle,
  DisconnectGamePort,
  DisconnectRoomHandlerPort,
  RegisterConnectionHandlersParams,
} from "../types/connectionPorts";

/** ソケット接続と切断イベントに対する共通ハンドラを登録する */
export const registerConnectionHandlers = ({
  io,
  gameManager,
  roomManager,
}: RegisterConnectionHandlersParams) => {
  const gameDisconnectOutputAdapter = createGameDisconnectOutputAdapter(io);
  const roomDisconnectOutputAdapter = createRoomDisconnectOutputAdapter(io);
  const connectionGameManager: ConnectionGamePort = gameManager;
  const disconnectGameManager: DisconnectGamePort = gameManager;
  const connectionRoomManager: ConnectionRoomPort = roomManager;
  const disconnectRoomManager: DisconnectRoomHandlerPort = roomManager;
  const disconnectPorts: DisconnectCoordinatorPortBundle = {
    gameManager: disconnectGameManager,
    roomManager: disconnectRoomManager,
    gameOutput: gameDisconnectOutputAdapter,
    roomOutput: roomDisconnectOutputAdapter,
  };

  io.on(protocol.SocketEvents.CONNECT, (socket: Socket) => {
    // 接続ログを記録してドメイン別ハンドラを登録する
    logEvent("Network", {
      event: "CONNECT",
      result: "connected",
      socketId: socket.id,
    });

    registerRoomHandlers(io, socket, connectionRoomManager);
    registerGameHandlers(io, socket, connectionGameManager, connectionRoomManager);

    socket.on(protocol.SocketEvents.DISCONNECT, () => {
      // 切断ログ記録後にドメイン別の後処理を実行する
      logEvent("Network", {
        event: "DISCONNECT",
        result: "disconnected",
        socketId: socket.id,
      });

      disconnectCoordinator({
        socketId: socket.id,
        ...disconnectPorts,
      });
    });
  });
};
