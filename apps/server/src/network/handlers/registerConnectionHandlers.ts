/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import { disconnectCoordinator } from "@server/application/coordinators/disconnectCoordinator";
import { registerGameHandlers } from "./GameHandler";
import { registerRoomHandlers } from "./RoomHandler";
import {
  createDisconnectOutputAdapters,
  createSocketOutputAdapters,
} from "./createOutputAdapters";
import { logConnected, logDisconnected } from "./connectionEventLogger";
import type {
  RegisterConnectionHandlersParams,
} from "../types/connectionPorts";

/** ソケット接続と切断イベントに対する共通ハンドラを登録する */
export const registerConnectionHandlers = ({
  io,
  roomManager,
  runtimeRegistry,
}: RegisterConnectionHandlersParams) => {
  const disconnectOutputAdapters = createDisconnectOutputAdapters(io);

  io.on(protocol.SocketEvents.CONNECT, (socket: Socket) => {
    const socketOutputAdapters = createSocketOutputAdapters(io, socket);

    // 接続ログを記録してドメイン別ハンドラを登録する
    logConnected(socket.id);

    registerRoomHandlers(
      socket,
      roomManager,
      runtimeRegistry,
      socketOutputAdapters.room,
    );
    registerGameHandlers(
      socket,
      roomManager,
      runtimeRegistry,
      socketOutputAdapters.game,
    );

    socket.on(protocol.SocketEvents.DISCONNECT, () => {
      // 切断ログ記録後にドメイン別の後処理を実行する
      logDisconnected(socket.id);

      disconnectCoordinator({
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        gameOutput: disconnectOutputAdapters.game,
        roomOutput: disconnectOutputAdapters.room,
      });
    });
  });
};
