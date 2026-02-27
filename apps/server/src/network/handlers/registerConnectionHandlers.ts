/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 */
import { Socket } from "socket.io";
import { protocol } from "@repo/shared";
import { disconnectCoordinator } from "@server/application/coordinators/disconnectCoordinator";
import { registerGameHandlers } from "./game/registerGameHandlers";
import { registerRoomHandlers } from "./room/registerRoomHandlers";
import {
  createDisconnectOutputAdapters,
} from "./createOutputAdapters";
import { logConnected, logDisconnected } from "./connectionEventLogger";
import {
  createConnectionRegistrationContext,
} from "./registration";
import {
  registerEvent,
  registerUnguardedEvent,
  type EventDefinition,
  type UnguardedEventDefinition,
} from "./eventDefinitionRegistrar";
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

  // CONNECTイベントを宣言的に登録する
  const onConnectEventDefinition: EventDefinition<
    typeof protocol.SocketEvents.CONNECT,
    Socket
> = {
    event: protocol.SocketEvents.CONNECT,
    orchestrate: (socket) => {
      const { deps, socketOutputAdapters } = createConnectionRegistrationContext(
        {
          io,
          roomManager,
          runtimeRegistry,
        },
        socket,
      );

      // 接続ログを記録してドメイン別ハンドラを登録する
      logConnected(deps.socket.id);

      registerRoomHandlers(
        deps.socket,
        deps.roomManager,
        deps.runtimeRegistry,
        socketOutputAdapters.room,
      );
      registerGameHandlers(
        deps.socket,
        deps.roomManager,
        deps.runtimeRegistry,
        socketOutputAdapters.game,
      );

      // ソケット単位イベントを宣言的に登録する
      const perSocketEventDefinition: UnguardedEventDefinition<
        typeof protocol.SocketEvents.DISCONNECT
      > = {
        event: protocol.SocketEvents.DISCONNECT,
        orchestrate: () => {
          // 切断ログ記録後にドメイン別の後処理を実行する
          logDisconnected(deps.socket.id);

          disconnectCoordinator({
            socketId: deps.socket.id,
            roomManager: deps.roomManager,
            runtimeRegistry: deps.runtimeRegistry,
            gameOutput: disconnectOutputAdapters.game,
            roomOutput: disconnectOutputAdapters.room,
          });
        },
      };

      registerUnguardedEvent(
        (event, callback) => {
          deps.socket.on(event, callback);
        },
        perSocketEventDefinition,
      );
    },
  };

  registerEvent(
    (event, callback) => {
      io.on(event, (socket) => {
        callback(socket);
      });
    },
    onConnectEventDefinition,
  );
};
