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
import {
  registerEvents,
  registerUnguardedEvents,
  type EventDefinition,
  type UnguardedEventDefinition,
} from "./eventDefinitionRegistrar";
import type {
  RegisterConnectionHandlersParams,
} from "../types/connectionPorts";

/** 接続イベント調停で利用する依存束 */
type ConnectionHandlerDeps = {
  io: Server;
  socket: Socket;
} & Omit<RegisterConnectionHandlersParams, "io">;

/** 接続ハンドラで利用する依存束を生成する */
const createConnectionHandlerDeps = (
  params: RegisterConnectionHandlersParams,
  socket: Socket,
): ConnectionHandlerDeps => {
  return {
    io: params.io,
    socket,
    roomManager: params.roomManager,
    runtimeRegistry: params.runtimeRegistry,
  };
};

/** ソケット接続と切断イベントに対する共通ハンドラを登録する */
export const registerConnectionHandlers = ({
  io,
  roomManager,
  runtimeRegistry,
}: RegisterConnectionHandlersParams) => {
  const disconnectOutputAdapters = createDisconnectOutputAdapters(io);

  // CONNECTイベントを宣言的に登録する
  const onConnectEventDefinitions: EventDefinition<
    typeof protocol.SocketEvents.CONNECT,
    Socket
  >[] = [
    {
      event: protocol.SocketEvents.CONNECT,
      orchestrate: (socket) => {
        const deps = createConnectionHandlerDeps(
          {
            io,
            roomManager,
            runtimeRegistry,
          },
          socket,
        );
        const socketOutputAdapters = createSocketOutputAdapters(deps.io, deps.socket);

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
        const perSocketEventDefinitions: UnguardedEventDefinition<
          typeof protocol.SocketEvents.DISCONNECT
        >[] = [
          {
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
          },
        ];

        registerUnguardedEvents(
          (event, callback) => {
            deps.socket.on(event, callback);
          },
          perSocketEventDefinitions,
        );
      },
    },
  ];

  registerEvents(
    (event, callback) => {
      io.on(event, (socket) => {
        callback(socket);
      });
    },
    onConnectEventDefinitions,
  );
};
