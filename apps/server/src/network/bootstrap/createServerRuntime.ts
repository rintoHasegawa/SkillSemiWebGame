/**
 * createServerRuntime
 * サーバー起動時に必要な依存オブジェクト群を組み立てる
 */
import type { Server as HttpServer } from "http";
import { RoomManager } from "@server/domains/room/RoomManager";
import { RoomGameRuntimeRegistry } from "@server/domains/room/application/services/RoomGameRuntimeRegistry";
import { SocketManager } from "@server/network/SocketManager";
import { createIo } from "./createIo";

/** 起動時に構築する実行コンテキスト */
export type ServerRuntime = {
  socketManager: SocketManager;
};

/** HTTPサーバーから実行コンテキストを構築する */
export const createServerRuntime = (
  httpServer: HttpServer,
): ServerRuntime => {
  const io = createIo(httpServer);
  const roomManager = new RoomManager();
  const runtimeRegistry = new RoomGameRuntimeRegistry(roomManager);
  const socketManager = new SocketManager(io, roomManager, runtimeRegistry);

  return {
    socketManager,
  };
};
