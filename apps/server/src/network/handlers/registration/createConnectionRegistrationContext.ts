/**
 * createConnectionRegistrationContext
 * 接続イベント登録で利用する依存束と送信アダプタを生成する
 */
import type { Server, Socket } from "socket.io";
import type { RegisterConnectionHandlersParams } from "../../types/connectionPorts";
import {
  createSocketOutputAdapters,
  type SocketOutputAdapters,
} from "../createOutputAdapters";

/** 接続イベント調停で利用する依存束 */
export type ConnectionHandlerDeps = {
  io: Server;
  socket: Socket;
} & Omit<RegisterConnectionHandlersParams, "io">;

/** 接続イベント登録で利用する共通コンテキスト */
export type ConnectionRegistrationContext = {
  deps: ConnectionHandlerDeps;
  socketOutputAdapters: SocketOutputAdapters;
};

/** 接続イベント登録で利用する共通コンテキストを生成する */
export const createConnectionRegistrationContext = (
  params: RegisterConnectionHandlersParams,
  socket: Socket,
): ConnectionRegistrationContext => {
  const deps: ConnectionHandlerDeps = {
    io: params.io,
    socket,
    roomManager: params.roomManager,
    runtimeRegistry: params.runtimeRegistry,
  };

  return {
    deps,
    socketOutputAdapters: createSocketOutputAdapters(deps.io, deps.socket),
  };
};
