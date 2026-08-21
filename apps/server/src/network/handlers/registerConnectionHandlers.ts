/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 */
import { Socket } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import { disconnectCoordinator } from "@server/application/coordinators/disconnectCoordinator";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
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
  // 高頻度同期のソケット別キャッシュは接続間で共有し，切断時に個別解放する
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();

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
        realtimeRoomSyncState,
      );

      // 接続ログを記録してドメイン別ハンドラを登録する
      logConnected(deps.socket.id);

      registerRoomHandlers(
        deps.socket,
        deps.roomManager,
        deps.runtimeRegistry,
        socketOutputAdapters.room,
      );
      registerGameHandlers({
        socket: deps.socket,
        roomManager: deps.roomManager,
        runtimeRegistry: deps.runtimeRegistry,
        gameOutputAdapter: socketOutputAdapters.game,
        roomOutputAdapter: socketOutputAdapters.room,
      });

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

          // 離脱通知の配信後に，このソケット向けの同期キャッシュを解放する
          realtimeRoomSyncState.releaseSocket(deps.socket.id);
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
