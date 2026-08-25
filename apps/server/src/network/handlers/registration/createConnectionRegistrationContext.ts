/**
 * createConnectionRegistrationContext
 * 接続イベント登録で利用する依存束と送信アダプタを生成する
 */
import type { Server, Socket } from "socket.io";
import type { RealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import type { RegisterConnectionHandlersParams } from "../../types/connectionPorts";
import {
  createSocketOutputAdapters,
  type SocketOutputAdapters,
} from "../createOutputAdapters";

/** 接続イベント調停で利用する依存束 */
type ConnectionHandlerDeps = {
  io: Server;
  socket: Socket;
} & Omit<RegisterConnectionHandlersParams, "io">;

/** 接続イベント登録で利用する共通コンテキスト */
type ConnectionRegistrationContext = {
  deps: ConnectionHandlerDeps;
  socketOutputAdapters: SocketOutputAdapters;
};

/**
 * 接続イベント登録で利用する共通コンテキストを生成する
 * 同期状態ストアはサーバー単位で共有するインスタンスを受け取る
 */
export const createConnectionRegistrationContext = (
  params: RegisterConnectionHandlersParams,
  socket: Socket,
  realtimeRoomSyncState: RealtimeRoomSyncStateStore,
): ConnectionRegistrationContext => {
  const deps: ConnectionHandlerDeps = {
    io: params.io,
    socket,
    roomManager: params.roomManager,
    runtimeRegistry: params.runtimeRegistry,
    identityRegistry: params.identityRegistry,
    sessionReservations: params.sessionReservations,
  };

  return {
    deps,
    socketOutputAdapters: createSocketOutputAdapters({
      io: deps.io,
      socket: deps.socket,
      deps: {
        roomManager: deps.roomManager,
        runtimeRegistry: deps.runtimeRegistry,
      },
      realtimeRoomSyncState,
      identityRegistry: deps.identityRegistry,
    }),
  };
};
